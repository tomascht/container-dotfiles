-- Keymaps are automatically loaded on the VeryLazy event
-- Default keymaps that are always set: https://github.com/LazyVim/LazyVim/blob/main/lua/lazyvim/config/keymaps.lua
-- Add any additional keymaps here
vim.keymap.set("n", "j", "gj")
vim.keymap.set("n", "k", "gk")

-- copy relative path to clipboard
vim.keymap.set("n", "<leader>cp", function()
  local root = LazyVim.root()
  local abs_path = vim.fn.expand("%:p")
  local path = abs_path:gsub("^" .. root .. "/", "")
  vim.fn.setreg("+", path)
  vim.notify("Copied: " .. path)
end, { desc = "Copy path relative to git root" })
