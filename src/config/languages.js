// id 同时是 Shiki 的语法 ID
export const CODE_LANGUAGES = [
  { id: 'cpp', name: 'C++', filename: 'main.cpp' },
  { id: 'c', name: 'C', filename: 'main.c' },
  { id: 'python', name: 'Python', filename: 'main.py' },
  { id: 'java', name: 'Java', filename: 'Main.java' },
  { id: 'javascript', name: 'JavaScript', filename: 'main.js' },
]

export const DEFAULT_LANGUAGE = 'cpp'

export const isCodeLanguage = (id) => CODE_LANGUAGES.some((l) => l.id === id)

export const languageById = (id) => CODE_LANGUAGES.find((l) => l.id === id) ?? CODE_LANGUAGES[0]

export const isDefaultFilename = (name) => CODE_LANGUAGES.some((l) => l.filename === name)
