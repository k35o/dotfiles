#!/usr/bin/env bash
set -euo pipefail

sudoers="$(mktemp)"
trap 'rm -f "$sudoers"' EXIT

cat >"$sudoers" <<EOF
$(id -un) ALL=(root) NOPASSWD: /usr/bin/pmset -a disablesleep 0, /usr/bin/pmset -a disablesleep 1
EOF

# 壊れた sudoers を置くと sudo 自体が使えなくなるため、設置前に検証する
visudo -cf "$sudoers" >/dev/null
sudo install -o root -g wheel -m 0440 "$sudoers" /etc/sudoers.d/capslock-awake
