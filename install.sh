#!/bin/sh

echo "Installing dotfiles and more"
apt update
apt upgrade

echo "Installing zsh"
apt install zsh

touch ~/.profile
echo "export SHELL=`which zsh`" >> ~/.profile
echo "`[ -z "$ZSH_VERSION" ] && exec \"$SHELL\" -l" >> ~/.profile
