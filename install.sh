#!/usr/bin/env bash

set -euo pipefail

echo "Installing dotfiles and more"
echo "install brew"
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

echo >>~/.bashrc
echo 'eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"' >>~/.bashrc

source ~/.bashrc

brew install zsh neovim ripgrep lazygit tmux jq node gh

cat >>~/.bashrc <<'EOF'

if [[ $- == *i* ]] && [[ -z "${BASH_EXECUTION_STRING:-}" ]] && [[ -t 1 ]] && command -v zsh >/dev/null 2>&1; then
  exec zsh -l
fi
EOF

## Lazyvim
# mv ~/.config/nvim{,.bak}
git clone https://github.com/LazyVim/starter ~/.config/nvim
cp lazyvim-keymaps.lua ~/.config/nvim/lua/config/keymaps.lua
cp lazyvim-options.lua ~/.config/nvim/lua/config/options.lua

sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"

if command -v zsh >/dev/null 2>&1 && [[ -w /etc/shells ]] && ! grep -qx "$(command -v zsh)" /etc/shells; then
  echo "$(command -v zsh)" >>/etc/shells
fi

if command -v chsh >/dev/null 2>&1; then
  chsh -s "$(command -v zsh)" "$(id -un)" || true
fi

# git set editor
# git config --global core.editor "nvim"
echo 'eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"' >>~/.zshrc
echo 'export SHELL="$(command -v zsh)"' >>~/.zshrc
echo 'export HISTFILE=/usr/local/hist/.zsh_history' >>~/.zshrc
echo 'export TERM="xterm-256color"' >>~/.zshrc
echo 'export EDITOR="nvim"' >>~/.zshrc

## aliases
cat >>~/.zshrc <<'EOF'
alias ll='ls -alh'
alias v='nvim'
alias gpp='git push -u origin $(git rev-parse --abbrev-ref HEAD)'
alias rails='bundle exec rails'
alias rspec='bundle exec rspec'
alias cap='bundle exec cap'
alias gfp='git fetch --all --prune'
EOF

## tmux setup
echo 'set -ga terminal-overrides ",xterm-256color:Tc"' >>~/.tmux.conf

## install claude code
echo 'export PATH="$HOME/.local/bin:$PATH"' >>~/.zshrc
curl -fsSL https://claude.ai/install.sh | bash

## claude code config
mkdir -p ~/.claude
cp claude-statusline.sh ~/.claude/statusline-command.sh
chmod +x ~/.claude/statusline-command.sh
cat >~/.claude/settings.json <<'EOF'
{
  "statusLine": {
    "type": "command",
    "command": "bash ~/.claude/statusline-command.sh"
  }
}
EOF

## install opencode
# mkdir -p $HOME/.local/tmp
# echo 'export TMPDIR="$HOME/.local/tmp"' >>~/.zshrc
# curl -fsSL https://opencode.ai/install | bash

## pi installation
# npm install -g @mariozechner/pi-coding-agent
## pi settings
# mkdir -p $HOME/.pi/agent/extensions
# cp .pi/* $HOME/.pi/agent/extensions/

# Install playwright
npx playwright install chromium

if [ -n "${GITHUB_TOKEN+x}" ]; then
  gh auth login
fi
