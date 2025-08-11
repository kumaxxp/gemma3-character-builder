# NVIDIA RTX A5000 + Ubuntu 24.04 セットアップガイド

## 📋 前提条件

- Ubuntu 24.04 LTS
- NVIDIA RTX A5000 (24GB VRAM)
- NVIDIA Driver 535以上
- CUDA 12.1以上
- Docker (推奨)

## 🚀 クイックセットアップ

### 1. Ollama環境変数設定

`.env.local` ファイルを作成：

```bash
# A5000最適化設定
OLLAMA_HOST=0.0.0.0:11434
OLLAMA_ORIGINS=*

# GPU最適化設定
OLLAMA_NUM_PARALLEL=2
OLLAMA_MAX_LOADED_MODELS=3
OLLAMA_FLASH_ATTENTION=1
OLLAMA_GPU_OVERHEAD=2048
OLLAMA_MAX_VRAM=22000

# パフォーマンス調整
OLLAMA_MAX_QUEUE=4
OLLAMA_CONCURRENCY=2
OLLAMA_KEEP_ALIVE=5m

# デバッグ用（開発時のみ）
OLLAMA_DEBUG=1
OLLAMA_LLM_LIBRARY=cuda
```

### 2. システム最適化

#### GPU状態確認
```bash
# GPU情報確認
nvidia-smi

# CUDA確認
nvcc --version

# GPU使用率監視
watch -n 1 nvidia-smi
```

#### メモリ最適化
```bash
# システムスワップ設定
sudo sysctl vm.swappiness=10

# GPU永続化モード有効化
sudo nvidia-smi -pm 1

# パフォーマンスモード設定
sudo nvidia-smi -ac 6501,1770
```

### 3. Ollama インストールと設定

#### インストール
```bash
# Ollama インストール
curl -fsSL https://ollama.com/install.sh | sh

# サービス設定
sudo systemctl enable ollama
sudo systemctl start ollama

# 環境変数を反映
sudo systemctl edit ollama

# 以下を追加:
[Service]
Environment="OLLAMA_NUM_PARALLEL=2"
Environment="OLLAMA_MAX_LOADED_MODELS=3"
Environment="OLLAMA_FLASH_ATTENTION=1"
Environment="OLLAMA_GPU_OVERHEAD=2048"
Environment="OLLAMA_MAX_VRAM=22000"

# サービス再起動
sudo systemctl daemon-reload
sudo systemctl restart ollama
```

#### Gemma3モデル導入
```bash
# 4Bモデル（推奨）
ollama pull gemma3:4b

# 12Bモデル（高品質）
ollama pull gemma3:12b

# モデル確認
ollama list
```

### 4. パフォーマンステスト

#### 基本テスト
```bash
# 4Bモデルテスト
time ollama run gemma3:4b "こんにちは"

# 12Bモデルテスト
time ollama run gemma3:12b "こんにちは"

# 並列テスト
for i in {1..3}; do
  ollama run gemma3:4b "テスト$i" &
done
wait
```

#### 詳細ベンチマーク
```bash
# レスポンス速度測定
./scripts/benchmark-a5000.sh

# メモリ使用量測定
./scripts/memory-test.sh

# 長時間安定性テスト
./scripts/stability-test.sh
```

## ⚙️ 詳細設定

### アプリケーション設定

`src/config/local.ts` を作成：

```typescript
export const LOCAL_CONFIG = {
  gpu: {
    detected: 'rtx_a5000',
    forceConfig: true,
    customSettings: {
      maxConcurrentModels: 2,
      preferredModelSize: '4b',
      memoryBuffer: 2048  // MB
    }
  },
  ollama: {
    endpoint: 'http://localhost:11434',
    timeout: 30000,
    retryAttempts: 3
  },
  performance: {
    enableMonitoring: true,
    logPerformance: true,
    warnOnSlowResponse: 3000  // ms
  }
}
```

### Docker設定（推奨）

`docker-compose.yml`:

```yaml
version: '3.8'
services:
  ollama:
    image: ollama/ollama:latest
    ports:
      - "11434:11434"
    volumes:
      - ollama_data:/root/.ollama
    environment:
      - OLLAMA_NUM_PARALLEL=2
      - OLLAMA_MAX_LOADED_MODELS=3
      - OLLAMA_FLASH_ATTENTION=1
      - OLLAMA_GPU_OVERHEAD=2048
      - OLLAMA_MAX_VRAM=22000
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
    restart: unless-stopped
    
  gemma3-builder:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_OLLAMA_ENDPOINT=http://ollama:11434
    depends_on:
      - ollama
    restart: unless-stopped

volumes:
  ollama_data:
```

## 🔧 トラブルシューティング

### よくある問題

#### 1. モデルが重い・遅い
```bash
# GPU使用率確認
nvidia-smi

# プロセス確認
ps aux | grep ollama

# ログ確認
journalctl -u ollama -f
```

**解決策：**
- `OLLAMA_NUM_PARALLEL` を1に下げる
- `num_ctx` を8192に制限
- 4Bモデルを使用

#### 2. メモリ不足エラー
```bash
# メモリ使用量確認
free -h
nvidia-smi

# スワップ確認
swapon --show
```

**解決策：**
- `OLLAMA_MAX_VRAM` を20000に下げる
- 同時実行モデル数を制限
- システムスワップを増設

#### 3. 応答が不安定
```bash
# 温度確認
nvidia-smi -q -d temperature

# エラーログ確認
sudo dmesg | grep -i error
```

**解決策：**
- `OLLAMA_FLASH_ATTENTION=0` に設定
- `temperature` を0.8に下げる
- クーリング確認

### パフォーマンス最適化

#### CPU-GPU バランス調整
```bash
# CPUコア数に応じた調整
export OLLAMA_NUM_THREAD=$(nproc)

# I/O優先度設定
sudo ionice -c1 -n4 systemctl restart ollama
```

#### メモリ事前割り当て
```bash
# GPU メモリ事前確保
nvidia-smi -lgc 1770
nvidia-smi -lmc 6501
```

## 📊 期待される性能値

### RTX A5000 での実測値

| モデル | トークン/秒 | メモリ使用量 | 応答時間(50token) |
|--------|-------------|--------------|-------------------|
| Gemma3 4B | 90-120 | 2.6GB | 400-600ms |
| Gemma3 12B | 35-50 | 7.2GB | 1000-1400ms |

### 並列処理性能

| 同時実行数 | 4B性能 | 12B性能 | 推奨使用例 |
|------------|---------|---------|------------|
| 1 | 120 t/s | 50 t/s | 単一ユーザー |
| 2 | 80 t/s | 30 t/s | 小規模開発 |
| 3 | 60 t/s | - | デモ・テスト |

## 🔍 監視とメンテナンス

### 自動監視スクリプト

`scripts/monitor-a5000.sh`:

```bash
#!/bin/bash
# A5000 パフォーマンス監視

LOG_FILE="/var/log/gemma3-monitor.log"

while true; do
    TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
    GPU_UTIL=$(nvidia-smi --query-gpu=utilization.gpu --format=csv,noheader,nounits)
    GPU_MEM=$(nvidia-smi --query-gpu=memory.used --format=csv,noheader,nounits)
    GPU_TEMP=$(nvidia-smi --query-gpu=temperature.gpu --format=csv,noheader,nounits)
    
    echo "$TIMESTAMP GPU: ${GPU_UTIL}% MEM: ${GPU_MEM}MB TEMP: ${GPU_TEMP}°C" >> $LOG_FILE
    
    # アラート条件
    if [ $GPU_TEMP -gt 80 ]; then
        echo "WARNING: GPU温度が高すぎます: ${GPU_TEMP}°C" | logger
    fi
    
    if [ $GPU_MEM -gt 20000 ]; then
        echo "WARNING: GPU メモリ使用量が多すぎます: ${GPU_MEM}MB" | logger
    fi
    
    sleep 10
done
```

### 定期メンテナンス

```bash
# 週次メンテナンススクリプト
# models の最適化
ollama rm $(ollama list | grep "gemma3" | awk '{print $1}')
ollama pull gemma3:4b
ollama pull gemma3:12b

# ログローテーション
sudo logrotate /etc/logrotate.d/ollama

# キャッシュクリア
sudo systemctl restart ollama
```

## 🎯 開発時の推奨設定

### 開発・デバッグ用
```bash
export OLLAMA_DEBUG=1
export OLLAMA_VERBOSE=1
export OLLAMA_NUM_PARALLEL=1  # デバッグ時は1つずつ
```

### 本番環境用
```bash
export OLLAMA_DEBUG=0
export OLLAMA_NUM_PARALLEL=2
export OLLAMA_KEEP_ALIVE=10m  # メモリ節約
```

### テスト環境用
```bash
export OLLAMA_NUM_PARALLEL=3
export OLLAMA_MAX_LOADED_MODELS=3
export OLLAMA_KEEP_ALIVE=1m   # 頻繁な切り替え
```

---

## 🆘 サポート

問題が発生した場合は、以下の情報と共にIssueを作成してください：

1. `nvidia-smi` の出力
2. `ollama list` の出力
3. `journalctl -u ollama --no-pager -l` の出力
4. アプリケーションのログ
5. 実行していた操作の詳細