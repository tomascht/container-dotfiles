#!/usr/bin/env bash

echo "Installing dotfiles and more"
echo "install brew"
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

echo >>~/.bashrc
echo 'eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"' >>~/.bashrc

source ~/.bashrc

brew install zsh neovim ripgrep lazygit zoxide tmux

echo 'exec zsh' >>~/.bashrc
echo 'export SHELL="$(which zsh)"

# Lazyvim
# mv ~/.config/nvim{,.bak}
git clone https://github.com/LazyVim/starter ~/.config/nvim

sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"

# git set editor
git config --global core.editor "nvim"
echo 'export TERM="xterm-256color"' >>~/.zshrc

# tmux setup
echo 'set -ga terminal-overrides ",xterm-256color:Tc"' >>~/.tmux.conf

# aliases
echo 'alias ll="ls -alh"' >>~/.zshrc
echo 'alias v="nvim"' >>~/.zshrc
echo 'alias gpp="git push -u origin $(git rev-parse --abbrev-ref HEAD)"' >>~/.zshrc
echo 'alias rails="bundle exec rails"' >>~/.zshrc
echo 'alias rspec="bundle exec rspec"' >>~/.zshrc
echo 'alias cap="bundle exec cap"' >>~/.zshrc
echo 'alias gfp="git fetch --all --prune"' >>~/.zshrc

# zoxide setup
echo 'eval "$(zoxide init zsh --cmd cd)"' >>~/.zshrc
