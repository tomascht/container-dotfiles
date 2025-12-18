#!/bin/sh

echo "Installing dotfiles and more"
#sudo apt update
#sudo apt upgrade

#echo "Installing zsh"
#sudo apt install zsh

#touch ~/.profile
>~/.profile
echo "export SHELL=$(which zsh)" >>~/.profile
echo "[ -z "$ZSH_VERSION" ] && exec \"$SHELL\" -l" >>~/.profile

echo "Install omz"
sh -c curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh
