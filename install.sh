#!/bin/sh

echo "Installing dotfiles and more"
#sudo apt update
#sudo apt upgrade

#echo "Installing zsh"
#sudo apt install zsh

#touch ~/.profile
>~/.profile
echo "exec \"$(which zsh)\" -l" >>~/.profile
