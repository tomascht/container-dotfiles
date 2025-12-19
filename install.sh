#!/usr/bin/env bash

echo "Installing dotfiles and more"
echo "install mise"
sudo apt update -y && sudo apt install -y curl
sudo install -dm 755 /etc/apt/keyrings
curl -fSs https://mise.jdx.dev/gpg-key.pub | sudo tee /etc/apt/keyrings/mise-archive-keyring.pub 1>/dev/null
echo "deb [signed-by=/etc/apt/keyrings/mise-archive-keyring.pub arch=amd64] https://mise.jdx.dev/deb stable main" | sudo tee /etc/apt/sources.list.d/mise.list
sudo apt update
sudo apt install -y mise ripgrep lazygit

# clear .bashrc
echo >>~/.bashrc

# use zsh
echo 'exec zsh' >>~/.bashrc

# active mise
echo 'eval "$(~/.local/bin/mise activate zsh)"' >>~/.zshrc
# reload .bashrc
source ~/.bashrc

# Neovim
mise plugins add neovim
mise i neovim@nightly

# Lazyvim
# mv ~/.config/nvim{,.bak}
git clone https://github.com/LazyVim/starter ~/.config/nvim

sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"

# git set editor
git config --global core.editor "nvim"

# aliases
echo 'alias ll="ls -alh"' >>~/.zshrc
echo 'alias v="nvim"' >>~/.zshrc
echo "alias gpp='git push -u origin $(git rev-parse --abbrev-ref HEAD)'" >>~/.zshrc
echo 'alias rails="bundle exec rails"' >>~/.zshrc
echo 'alias rspec="bundle exec rspec"' >>~/.zshrc
echo 'alias cap="bundle exec cap"' >>~/.zshrc
echo 'alias gfp="git fetch --all --prune"' >>~/.zshrc

# zoxide setup
echo 'eval "$(zoxide init zsh --cmd cd)"' >>~/.zshrc
