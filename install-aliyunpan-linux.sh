#!/bin/bash

###############################################################################
# Aliyunpan CLI Installer for Linux
# Supports: Ubuntu, Debian, CentOS, Rocky Linux, Alpine
# Architectures: x86, x64, ARM, ARM64
###############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Print functions
print_header() {
    echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║          Aliyunpan CLI Installer for Linux               ║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# Detect OS and architecture
detect_system() {
    # Detect OS
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$ID
        OS_VERSION=$VERSION_ID
    elif [ -f /etc/redhat-release ]; then
        OS="rhel"
    elif [ -f /etc/alpine-release ]; then
        OS="alpine"
    else
        OS=$(uname -s | tr '[:upper:]' '[:lower:]')
    fi

    # Detect architecture
    ARCH=$(uname -m)
    case $ARCH in
        x86_64|amd64)
            ARCH="amd64"
            ;;
        i386|i686)
            ARCH="386"
            ;;
        aarch64|arm64)
            ARCH="arm64"
            ;;
        armv7l)
            ARCH="armv7"
            ;;
        armv6l)
            ARCH="armv6"
            ;;
        *)
            print_error "Unsupported architecture: $ARCH"
            exit 1
            ;;
    esac

    print_info "Detected OS: $OS"
    print_info "Detected Architecture: $ARCH"
}

# Check if Node.js is installed
check_nodejs() {
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node -v)
        print_success "Node.js found: $NODE_VERSION"
        return 0
    else
        print_warn "Node.js not found. Installing..."
        install_nodejs
        return $?
    fi
}

# Install Node.js if not present
install_nodejs() {
    print_info "Installing Node.js..."

    case $OS in
        ubuntu|debian)
            curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
            sudo apt-get install -y nodejs
            ;;
        centos|rhel|rocky|fedora)
            curl -fsSL https://rpm.nodesource.com/setup_lts.x | sudo bash -
            sudo yum install -y nodejs
            ;;
        alpine)
            apk add --no-cache nodejs npm
            ;;
        *)
            print_error "Cannot automatically install Node.js on $OS"
            print_info "Please install Node.js manually: https://nodejs.org/"
            exit 1
            ;;
    esac

    if command -v node &> /dev/null; then
        print_success "Node.js installed: $(node -v)"
    else
        print_error "Failed to install Node.js"
        exit 1
    fi
}

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INSTALLER_DIR="$SCRIPT_DIR/aliyunpan-installer"

# Main installation function
install_aliyunpan() {
    print_header

    detect_system

    # Check if installer directory exists
    if [ ! -d "$INSTALLER_DIR" ]; then
        print_error "Installer directory not found: $INSTALLER_DIR"
        print_info "Please ensure aliyunpan-installer folder exists in the same directory as this script."
        exit 1
    fi

    # Check/install Node.js
    check_nodejs

    # Install dependencies
    print_info "Installing dependencies..."
    cd "$INSTALLER_DIR"

    if ! npm install --production --no-fund --no-audit 2>/dev/null; then
        print_warn "No npm dependencies found or npm install failed"
    fi

    # Make the script executable
    chmod +x index.js

    # Run the installer
    print_info "Starting aliypan installation..."
    echo ""

    if node index.js; then
        echo ""
        print_success "═════════════════════════════════════════════════════"
        print_success "Installation completed successfully!"
        print_success "═════════════════════════════════════════════════════"
        echo ""
        print_info "You can now run aliyunpan from anywhere:"
        echo -e "  ${GREEN}aliyunpan${NC}"
        echo ""
        print_info "For more commands, run:"
        echo -e "  ${GREEN}aliyunpan help${NC}"
        echo ""
    else
        print_error "Installation failed!"
        exit 1
    fi
}

# Run main function
install_aliyunpan
