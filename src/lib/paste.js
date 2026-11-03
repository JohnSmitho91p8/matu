// 粘贴时的文本处理：换行统一为 \n，制表符转 4 个空格，
// 去掉开头和结尾整行都是空白的行（中间的空行和首行自己的缩进保留）
export function cleanPastedText(text) {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/\t/g, '    ')
    .replace(/^(?:[^\S\n]*\n)+/, '')
    .replace(/(?:\n[^\S\n]*)+$/, '')
}

// 粘贴时选中了全部内容，等于换成一段全新的代码
export function replacesWholeDocument(value, selectionStart, selectionEnd) {
  return value.length > 0 && selectionStart === 0 && selectionEnd === value.length
}
