#!/usr/bin/env node

/**
 * Aliyunpan CLI Automatic Installer
 * Supports: Linux, Windows, macOS (x86/x64/ARM)
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const https = require('https');
const http = require('http');
const { createReadStream, createWriteStream } = require('fs');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

class AliyunpanInstaller {
  constructor() {
    this.platform = os.platform();
    this.arch = this.normalizeArch(os.arch());
    this.tempDir = path.join(os.tmpdir(), 'aliyunpan-installer');
    this.installDir = this.getInstallDir();
    this.latestVersion = null;
  }

  normalizeArch(arch) {
    const archMap = {
      'x64': 'amd64',
      'x86': '386',
      'arm64': 'arm64',
      'arm': 'armv7',
      'ia32': '386'
    };
    return archMap[arch] || arch;
  }

  getInstallDir() {
    const homeDir = os.homedir();
    switch (this.platform) {
      case 'win32':
        return path.join(homeDir, 'aliyunpan');
      case 'darwin':
        return path.join(homeDir, 'Applications', 'aliyunpan');
      default:
        return path.join(homeDir, 'aliyunpan');
    }
  }

  log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
  }

  error(message) {
    this.log(`ERROR: ${message}`, 'red');
  }

  success(message) {
    this.log(message, 'green');
  }

  info(message) {
    this.log(message, 'cyan');
  }

  warn(message) {
    this.log(message, 'yellow');
  }

  async getLatestVersion() {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.github.com',
        path: '/repos/tickstep/aliyunpan/releases/latest',
        headers: {
          'User-Agent': 'Aliyunpan-Installer'
        }
      };

      https.get(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const release = JSON.parse(data);
            this.latestVersion = release.tag_name.replace('v', '');
            resolve(this.latestVersion);
          } catch (e) {
            // Fallback to a known version
            resolve('0.3.7');
          }
        });
      }).on('error', () => {
        // Fallback to a known version
        resolve('0.3.7');
      });
    });
  }

  getDownloadUrl(version) {
    const platformMap = {
      'win32': 'windows',
      'darwin': 'macos',
      'linux': 'linux'
    };

    const platform = platformMap[this.platform];
    if (!platform) {
      throw new Error(`Unsupported platform: ${this.platform}`);
    }

    // Map architectures for different platforms
    let downloadArch = this.arch;
    if (this.platform === 'win32' && this.arch === 'amd64') {
      downloadArch = 'x64';
    } else if (this.platform === 'win32' && this.arch === '386') {
      downloadArch = 'x86';
    }

    const filename = `aliyunpan-v${version}-${platform}-${downloadArch}.zip`;

    // Return multiple mirrors
    return {
      github: `https://github.com/tickstep/aliyunpan/releases/download/v${version}/${filename}`,
      ghproxy: `https://ghproxy.com/https://github.com/tickstep/aliyunpan/releases/download/v${version}/${filename}`,
      mirror: `https://mirrors.aliyun.com/aliyunpan/${filename}`,
      filename: filename
    };
  }

  detectPackageManager() {
    try {
      execSync('which apt-get', { stdio: 'ignore' });
      return 'apt';
    } catch {}
    try {
      execSync('which yum', { stdio: 'ignore' });
      return 'yum';
    } catch {}
    try {
      execSync('which brew', { stdio: 'ignore' });
      return 'brew';
    } catch {}
    try {
      execSync('which winget', { stdio: 'ignore' });
      return 'winget';
    } catch {}
    return null;
  }

  async installViaPackageManager() {
    const pm = this.detectPackageManager();
    if (!pm) return false;

    this.info(`Detected package manager: ${pm}`);

    const commands = {
      'apt': [
        'curl -fsSL http://file.tickstep.com/apt/pgp | gpg --dearmor | sudo tee /etc/apt/trusted.gpg.d/tickstep-packages-archive-keyring.gpg > /dev/null',
        `echo "deb [signed-by=/etc/apt/trusted.gpg.d/tickstep-packages-archive-keyring.gpg arch=${this.arch === 'amd64' ? 'amd64,arm64' : 'amd64'}] http://file.tickstep.com/apt aliyunpan main" | sudo tee /etc/apt/sources.list.d/tickstep-aliyunpan.list > /dev/null`,
        'sudo apt-get update',
        'sudo apt-get install -y aliyunpan'
      ],
      'yum': [
        'sudo curl -fsSL http://file.tickstep.com/rpm/aliyunpan/aliyunpan.repo | sudo tee /etc/yum.repos.d/tickstep-aliyunpan.repo > /dev/null',
        'sudo yum install aliyunpan -y'
      ],
      'brew': [
        'brew install aliyunpan'
      ],
      'winget': [
        'winget install tickstep.aliyunpan --silent'
      ]
    };

    const cmdList = commands[pm];
    if (!cmdList) return false;

    for (const cmd of cmdList) {
      this.info(`Running: ${cmd}`);
      try {
        execSync(cmd, { stdio: 'inherit' });
      } catch (e) {
        this.error(`Failed to execute: ${cmd}`);
        return false;
      }
    }

    return true;
  }

  async downloadAndInstall() {
    const version = await this.getLatestVersion();
    this.info(`Installing aliyunpan v${version} for ${this.platform}-${this.arch}`);

    // Create temp directory
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }

    // Create install directory
    if (!fs.existsSync(this.installDir)) {
      fs.mkdirSync(this.installDir, { recursive: true });
    }

    const urls = this.getDownloadUrl(version);
    const zipFile = path.join(this.tempDir, urls.filename);

    // Try different mirrors
    const mirrors = [
      { name: 'GitHub', url: urls.github },
      { name: 'GHProxy', url: urls.ghproxy },
      { name: 'Aliyun Mirror', url: urls.mirror }
    ];

    let downloaded = false;

    for (const mirror of mirrors) {
      if (downloaded) break;

      this.info(`Trying ${mirror.name}: ${mirror.url}`);

      // Try with curl
      try {
        if (this.hasCommand('curl')) {
          this.info(`Downloading with curl from ${mirror.name}...`);
          execSync(`curl -L -o "${zipFile}" "${mirror.url}"`, { stdio: 'inherit', timeout: 60000 });
          downloaded = true;
          this.success(`Downloaded from ${mirror.name}!`);
          break;
        }
      } catch (e) {
        this.warn(`${mirror.name} (curl): ${e.message}`);
      }

      // Try with wget
      try {
        if (this.hasCommand('wget')) {
          this.info(`Downloading with wget from ${mirror.name}...`);
          execSync(`wget -O "${zipFile}" "${mirror.url}"`, { stdio: 'inherit', timeout: 60000 });
          downloaded = true;
          this.success(`Downloaded from ${mirror.name}!`);
          break;
        }
      } catch (e) {
        this.warn(`${mirror.name} (wget): ${e.message}`);
      }

      // Try with Node.js (only for GitHub)
      if (mirror.name === 'GitHub') {
        try {
          this.info(`Downloading with Node.js from ${mirror.name}...`);
          await this.downloadFile(mirror.url, zipFile);
          downloaded = true;
          this.success(`Downloaded from ${mirror.name}!`);
          break;
        } catch (e) {
          this.warn(`${mirror.name} (Node.js): ${e.message}`);
        }
      }
    }

    if (!downloaded) {
      throw new Error('Failed to download from all mirrors. Please check your network connection.');
    }

    // Verify download
    if (!fs.existsSync(zipFile) || fs.statSync(zipFile).size === 0) {
      throw new Error('Download failed: file is empty or does not exist');
    }

    this.info(`Downloaded file size: ${(fs.statSync(zipFile).size / 1024 / 1024).toFixed(2)} MB`);

    // Extract (platform-specific)
    if (this.platform === 'win32') {
      await this.extractWindows(zipFile);
    } else {
      await this.extractUnix(zipFile);
    }

    // Setup executable
    await this.setupExecutable();

    this.success('Installation completed!');
  }

  hasCommand(cmd) {
    try {
      execSync(`which ${cmd}`, { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  downloadFile(url, dest, retries = 3) {
    return new Promise((resolve, reject) => {
      const attemptDownload = (attempt) => {
        const protocol = url.startsWith('https') ? https : http;
        const file = createWriteStream(dest);

        const options = {
          headers: {
            'User-Agent': 'Aliyunpan-Installer'
          },
          timeout: 60000,
          rejectUnauthorized: false
        };

        const req = protocol.get(url, options, (res) => {
          if (res.statusCode === 302 || res.statusCode === 301) {
            // Follow redirect
            file.close();
            if (fs.existsSync(dest)) {
              fs.unlinkSync(dest);
            }
            this.downloadFile(res.headers.location, dest, retries).then(resolve).catch(reject);
            return;
          }

          if (res.statusCode !== 200) {
            file.close();
            if (fs.existsSync(dest)) {
              fs.unlinkSync(dest);
            }
            reject(new Error(`Download failed with status: ${res.statusCode}`));
            return;
          }

          const totalSize = parseInt(res.headers['content-length'], 10);
          let downloadedSize = 0;

          res.on('data', (chunk) => {
            downloadedSize += chunk.length;
            if (totalSize) {
              const percent = Math.floor((downloadedSize / totalSize) * 100);
              process.stdout.write(`\r  Downloading: ${percent}% (${(downloadedSize / 1024 / 1024).toFixed(2)} MB)`);
            }
          });

          res.pipe(file);

          file.on('finish', () => {
            file.close();
            console.log(); // New line after progress
            this.info('Download completed!');
            resolve();
          });
        });

        req.on('timeout', () => {
          req.destroy();
          file.close();
          if (fs.existsSync(dest)) {
            fs.unlinkSync(dest);
          }
          if (attempt < retries) {
            this.warn(`Download timed out, retrying (${attempt + 1}/${retries})...`);
            setTimeout(() => attemptDownload(attempt + 1), 2000);
          } else {
            reject(new Error('Download timed out after multiple retries'));
          }
        });

        req.on('error', (err) => {
          file.close();
          if (fs.existsSync(dest)) {
            fs.unlinkSync(dest);
          }
          if (attempt < retries && (err.code === 'ECONNRESET' || err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT')) {
            this.warn(`Download failed: ${err.message}, retrying (${attempt + 1}/${retries})...`);
            setTimeout(() => attemptDownload(attempt + 1), 2000);
          } else {
            reject(err);
          }
        });
      };

      attemptDownload(1);
    });
  }

  async extractWindows(zipFile) {
    // Try adm-zip first (most reliable cross-platform)
    try {
      const AdmZip = require('adm-zip');
      this.info('Extracting using adm-zip...');

      const zip = new AdmZip(zipFile);
      const zipEntries = zip.getEntries();

      this.info(`Extracting ${zipEntries.length} files...`);

      zip.extractAllTo(this.tempDir, true);
      this.success('Extraction completed!');
      return;
    } catch (e) {
      this.warn(`adm-zip extraction failed: ${e.message}`);
    }

    // Try tar first (available in MINGW64/Git Bash)
    try {
      this.info('Extracting using tar...');
      execSync(`tar -xf "${zipFile}" -C "${this.tempDir}"`, { stdio: 'inherit' });
      return;
    } catch (e) {
      this.warn('tar extraction failed, trying PowerShell...');
    }

    // Try PowerShell
    try {
      this.info('Extracting using PowerShell...');
      // Clear temp directory first
      const entries = fs.existsSync(this.tempDir) ? fs.readdirSync(this.tempDir) : [];
      for (const entry of entries) {
        const entryPath = path.join(this.tempDir, entry);
        try {
          const stat = fs.statSync(entryPath);
          if (stat.isDirectory()) {
            fs.rmSync(entryPath, { recursive: true, force: true });
          } else {
            fs.unlinkSync(entryPath);
          }
        } catch {}
      }

      // Use PowerShell with proper escaping
      const psScript = `
        $ErrorActionPreference = 'Stop'
        try {
          Expand-Archive -LiteralPath '${zipFile.replace(/\\/g, '\\\\')}' -DestinationPath '${this.tempDir.replace(/\\/g, '\\\\')}' -Force
          Write-Output 'SUCCESS'
        } catch {
          Write-Error $_.Exception.Message
          exit 1
        }
      `;
      const result = execSync(`powershell -NoProfile -Command "${psScript.replace(/\n/g, ' ')}"`, {
        stdio: 'pipe',
        windowsHide: true,
        encoding: 'utf8'
      });
      if (result.includes('SUCCESS')) {
        return;
      }
    } catch (e) {
      this.warn(`PowerShell extraction failed: ${e.message}`);
    }

    this.error('All extraction methods failed. Please ensure the zip file is valid.');
    throw new Error('Failed to extract zip file');
  }

  async extractUnix(zipFile) {
    try {
      execSync(`unzip -o "${zipFile}" -d "${this.tempDir}"`, { stdio: 'inherit' });
    } catch (e) {
      this.error('unzip not found. Please install unzip: apt-get install unzip / yum install unzip');
      throw e;
    }
  }

  async setupExecutable() {
    // Clean install directory first
    if (fs.existsSync(this.installDir)) {
      const oldEntries = fs.readdirSync(this.installDir);
      for (const entry of oldEntries) {
        const entryPath = path.join(this.installDir, entry);
        const stat = fs.statSync(entryPath);
        if (stat.isDirectory()) {
          fs.rmSync(entryPath, { recursive: true, force: true });
        } else {
          fs.unlinkSync(entryPath);
        }
      }
    }

    // Find the extracted directory or files
    const entries = fs.readdirSync(this.tempDir, { withFileTypes: true });

    // Look for aliyunpan directory
    let sourceDir = this.tempDir;
    const extractedDir = entries.find(e => e.isDirectory() && e.name.includes('aliyunpan'));

    if (extractedDir) {
      sourceDir = path.join(this.tempDir, extractedDir.name);
    }

    this.info(`Source directory: ${sourceDir}`);
    this.info(`Install directory: ${this.installDir}`);

    // Copy files to install directory
    const files = fs.readdirSync(sourceDir, { withFileTypes: true });
    for (const file of files) {
      const srcPath = path.join(sourceDir, file.name);
      const destPath = path.join(this.installDir, file.name);

      if (file.isDirectory()) {
        if (!fs.existsSync(destPath)) {
          fs.mkdirSync(destPath, { recursive: true });
        }
        this.copyDirectory(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }

    // Make executable on Unix
    if (this.platform !== 'win32') {
      const exeName = 'aliyunpan';
      const exePath = path.join(this.installDir, exeName);
      if (fs.existsSync(exePath)) {
        fs.chmodSync(exePath, '755');
      }

      // Create symlink
      const binDir = '/usr/local/bin';
      try {
        if (!fs.existsSync(binDir)) {
          fs.mkdirSync(binDir, { recursive: true });
        }
        execSync(`sudo ln -sf "${exePath}" "${binDir}/aliyunpan"`, { stdio: 'ignore' });
        this.success('Created symlink: /usr/local/bin/aliyunpan');
      } catch (e) {
        this.warn('Could not create symlink. You may need to add to PATH manually.');
      }
    }

    // Add to PATH on Windows
    if (this.platform === 'win32') {
      this.info(`Install location: ${this.installDir}`);
      this.info('Please add this directory to your PATH environment variable');
    }
  }

  copyDirectory(src, dest) {
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      if (entry.isDirectory()) {
        if (!fs.existsSync(destPath)) {
          fs.mkdirSync(destPath);
        }
        this.copyDirectory(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }

  getExecutablePath() {
    if (this.platform === 'win32') {
      return path.join(this.installDir, 'aliyunpan.exe');
    }
    return path.join(this.installDir, 'aliyunpan');
  }

  async runLogin() {
    const exePath = this.getExecutablePath();

    if (!fs.existsSync(exePath)) {
      this.error('aliyunpan executable not found!');
      return;
    }

    this.info('\n=== Aliyunpan Login ===');
    this.info('Launching aliyunpan for login verification...\n');

    // Run in interactive mode
    const child = spawn(exePath, [], {
      stdio: 'inherit',
      cwd: this.installDir
    });

    return new Promise((resolve) => {
      child.on('exit', (code) => {
        if (code === 0) {
          this.success('Login session completed.');
        } else {
          this.warn(`aliyunpan exited with code: ${code}`);
        }
        resolve(code);
      });
    });
  }

  async verifyInstallation() {
    const exePath = this.getExecutablePath();

    if (!fs.existsSync(exePath)) {
      return false;
    }

    try {
      const version = execSync(`"${exePath}" version`, {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'ignore']
      });
      this.info(`Installed version: ${version.trim()}`);
      return true;
    } catch (e) {
      // Try without version command
      return true;
    }
  }

  async run() {
    this.log('\n╔════════════════════════════════════════════════════════════╗', 'bright');
    this.log('║          Aliyunpan CLI Automatic Installer              ║', 'bright');
    this.log('╚════════════════════════════════════════════════════════════╝', 'bright');
    this.log('');

    this.info(`Platform: ${this.platform}-${this.arch}`);
    this.info(`Install Directory: ${this.installDir}`);
    this.log('');

    // Check if already installed
    if (await this.verifyInstallation()) {
      this.warn('aliyunpan is already installed!');
      const answer = process.env.CI ? 'n' : await this.prompt('Do you want to reinstall? (y/N): ');
      if (answer.toLowerCase() !== 'y') {
        this.info('Skipping installation. Running login...');
        await this.runLogin();
        return;
      }
    }

    // Try package manager first
    if (this.platform !== 'win32') {
      this.info('Attempting installation via package manager...');
      const pmSuccess = await this.installViaPackageManager();
      if (pmSuccess) {
        this.success('Installation via package manager successful!');
        await this.runLogin();
        return;
      }
      this.info('Package manager installation not available, downloading...');
    }

    // Download and install
    await this.downloadAndInstall();

    this.log('');
    this.success('═════════════════════════════════════════════════════');
    this.success('Installation completed successfully!');
    this.success('═════════════════════════════════════════════════════');
    this.log('');

    // Show usage info
    this.log('Usage:', 'cyan');
    if (this.platform === 'win32') {
      this.log(`  Run: ${this.getExecutablePath()}`);
      this.log(`  Or add "${this.installDir}" to your PATH`);
    } else {
      this.log(`  Run: aliyunpan`);
      this.log(`  Or: ${this.getExecutablePath()}`);
    }
    this.log('');

    // Run login
    await this.runLogin();
  }

  prompt(question) {
    return new Promise((resolve) => {
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      rl.question(question, (answer) => {
        rl.close();
        resolve(answer.trim());
      });
    });
  }
}

// Main execution
(async () => {
  const installer = new AliyunpanInstaller();
  try {
    await installer.run();
  } catch (error) {
    installer.error(error.message);
    process.exit(1);
  }
})();
