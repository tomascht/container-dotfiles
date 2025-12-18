#!/usr/bin/env bash

echo "Installing dotfiles and more"
#sudo apt update
#sudo apt upgrade

#echo "Installing zsh"
#sudo apt install zsh

#touch ~/.profile
echo "install brew"
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

echo >>~/.bashrc
echo 'eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"' >>~/.bashrc

source ~/.bashrc

brew install zsh vim neovim ripgrep

echo 'exec zsh' >>~/.bashrc

# Lazyvim
mv ~/.config/nvim{,.bak}

git clone https://github.com/LazyVim/starter ~/.config/nvim
