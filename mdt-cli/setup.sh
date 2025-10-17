#!/bin/bash

# MDT CLI Setup Script

set -e

echo "🚀 Setting up MDT CLI..."

# Check if Python 3 is available
if ! command -v python3 &> /dev/null; then
    echo "❌ Error: Python 3 is required but not installed."
    exit 1
fi

# Create virtual environment if it doesn't exist
if [ ! -d ".venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv .venv
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source .venv/bin/activate

# Install dependencies
echo "📚 Installing dependencies..."
pip install -r requirements.txt

# Make CLI executable
echo "🔐 Making CLI executable..."
chmod +x mdt.py

# Check configuration
echo "⚙️ Checking configuration..."
python3 -c "
from config import Config
Config.print_config_info()
issues = Config.validate_config()
if issues:
    print('\n⚠️ Configuration Issues:')
    for issue in issues:
        print(f'  {issue}')
else:
    print('\n✅ Configuration is valid')
"

echo ""
echo "✅ MDT CLI setup complete!"
echo ""
echo "Usage examples:"
echo "  ./mdt.py MDT-066              # Basic usage"
echo "  ./mdt.py MDT-066 --verbose    # Verbose output"
echo "  ./mdt.py --config-info        # Show configuration"
echo ""
echo "Optional: Create symlink for global access:"
echo "  sudo ln -s $(pwd)/mdt.py /usr/local/bin/mdt"
echo ""