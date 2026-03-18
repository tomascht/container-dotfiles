#!/usr/bin/env bash

echo "Installing dotfiles and more"
echo "install brew"
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

echo >>~/.bashrc
echo 'eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"' >>~/.bashrc

source ~/.bashrc

brew install zsh neovim ripgrep lazygit zoxide tmux

echo 'exec zsh' >>~/.bashrc
echo 'export SHELL="$(which zsh)"'

# Lazyvim
# mv ~/.config/nvim{,.bak}
git clone https://github.com/LazyVim/starter ~/.config/nvim
cp lazyvim-keymaps.lua ~/.config/nvim/lua/config/keymaps.lua
cp lazyvim-options.lua ~/.config/nvim/lua/config/options.lua

sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"

# git set editor
# git config --global core.editor "nvim"
echo 'export TERM="xterm-256color"' >>~/.zshrc

# tmux setup
echo 'set -ga terminal-overrides ",xterm-256color:Tc"' >>~/.tmux.conf

# aliases
cat >>~/.zshrc <<'EOF'
alias ll='ls -alh'
alias v='nvim'
alias gpp='git push -u origin $(git rev-parse --abbrev-ref HEAD)'
alias rails='bundle exec rails'
alias rspec='bundle exec rspec'
alias cap='bundle exec cap'
alias gfp='git fetch --all --prune'

# zoxide setup
eval "$(zoxide init zsh --cmd cd)"
EOF

# install claude code
echo 'export PATH="$HOME/.local/bin:$PATH"' >>~/.zshrc
curl -fsSL https://claude.ai/install.sh | bash

# claude code config
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
