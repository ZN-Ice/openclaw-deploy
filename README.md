# openclaw-deploy

记录openclaw部署的一些探索，方便在环境重启后快速部署

## Aliyunpan CLI Auto-Installer

自动安装阿里云盘命令行客户端 (aliyunpan) 的跨平台工具。

### 特性

- 跨平台支持: Linux, Windows, macOS
- 多架构支持: x86, x64, ARM, ARM64
- 自动检测系统和包管理器
- 优先使用系统包管理器安装 (apt, yum, brew, winget)
- 支持从 GitHub Releases 直接下载安装
- 安装后自动触发登录验证

### 系统要求

- **Node.js** >= 14.0.0 (如果未安装会自动安装)
- **Linux**: 需要 unzip 命令
- **Windows**: PowerShell 5.1+

### 快速开始

#### Linux / macOS

```bash
# 1. 进入项目目录
cd openclaw-deploy

# 2. 执行安装脚本
chmod +x install-aliyunpan-linux.sh
./install-aliyunpan-linux.sh
```

#### Windows (PowerShell)

```powershell
# 1. 以管理员身份运行 PowerShell

# 2. 进入项目目录
cd path\to\openclaw-deploy

# 3. 执行安装脚本
.\install-aliyunpan-windows.ps1
```

如果遇到执行策略限制：

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### 目录结构

```
openclaw-deploy/
├── aliyunpan-installer/          # JS 安装器核心
│   ├── package.json              # npm 包配置
│   └── index.js                  # 主安装逻辑
├── install-aliyunpan-linux.sh    # Linux/macOS 安装脚本
├── install-aliyunpan-windows.ps1 # Windows 安装脚本
└── README.md                     # 本文档
```

### 支持的平台

| 操作系统   | 架构         | 状态  |
|-----------|-------------|-------|
| Linux     | amd64/x64   | OK    |
| Linux     | 386/x86     | OK    |
| Linux     | arm64       | OK    |
| Linux     | arm/armv7   | OK    |
| Windows   | x64         | OK    |
| Windows   | x86         | OK    |
| macOS     | amd64       | OK    |
| macOS     | arm64       | OK    |

### 基本使用

安装完成后：

```bash
# 启动交互模式
aliyunpan

# 登录
aliyunpan > login

# 查看文件列表
aliyunpan > ls

# 下载文件
aliyunpan > download <file>

# 上传文件
aliyunpan > upload <local-file> /remote/path
```

详细文档请访问: [aliyunpan GitHub](https://github.com/tickstep/aliyunpan)
