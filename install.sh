#!/usr/bin/env bash

echo "Installing dotfiles and more"
echo "install brew"
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

echo >>~/.bashrc
echo 'eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"' >>~/.bashrc

source ~/.bashrc

brew install zsh vim neovim ripgrep

echo 'exec zsh' >>~/.bashrc

# Lazyvim
# mv ~/.config/nvim{,.bak}
git clone https://github.com/LazyVim/starter ~/.config/nvim

sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"

echo 'alias ll="ls -alh"' >>~/.zshrc
