#!/bin/sh

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

brew install neovim

# Lazyvim
git clone https://github.com/LazyVim/starter ~/.config/nvim
