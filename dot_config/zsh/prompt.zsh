# vcs_info は push 待ちや未追跡ファイルを出すのに hook と追加の git 呼び出しが要るため、git status を1回だけ読む。
# ブランチ名を % の書式として解釈させないよう、prompt_subst は使わず PROMPT を毎回組み立てる
_prompt_precmd() {
  local -a st
  local line oid head ahead=0 marks=
  local count="${XDG_CACHE_HOME:-$HOME/.cache}/dotfiles-notify/count"

  PROMPT=$'\n%B%F{cyan}%3~%f%b'
  if st=("${(@f)$(git status --porcelain=v2 --branch 2>/dev/null)}"); then
    for line in $st; do
      case $line in
        ('# branch.oid '*) oid=${line#\# branch.oid } ;;
        ('# branch.head '*) head=${line#\# branch.head } ;;
        ('# branch.ab '*) ahead=${${line#\# branch.ab +}%% *} ;;
        ('#'*) ;;
        (*) marks='!' ;;
      esac
    done
    [[ $head == '(detached)' ]] && head=${oid[1,7]}
    (( ahead )) && marks+='⇡'
    PROMPT+=" on %B%F{magenta}${head//\%/%%}%f%b"
    [[ -n $marks ]] && PROMPT+=" %B%F{red}[$marks]%f%b"
  fi
  [[ -s $count ]] && PROMPT+=" %B%F{yellow}dotfiles ⇣$(<$count)%f%b"
  PROMPT+=$'\n%(?.🫠.🤯) '
}

autoload -Uz add-zsh-hook
add-zsh-hook precmd _prompt_precmd
