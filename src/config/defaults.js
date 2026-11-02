export const DEFAULT_FILENAME = 'main.cpp'

export const DEFAULT_CODE = `#include <bits/stdc++.h>
using namespace std;

// 快速幂：计算 a^b mod p
long long qpow(long long a, long long b, long long p) {
    long long res = 1;
    a %= p;
    while (b) {
        if (b & 1) res = res * a % p;  // 当前位是 1 就乘上
        a = a * a % p;
        b >>= 1;
    }
    return res;
}

int main() {
    cout << qpow(2, 10, 1000000007) << endl;  // 输出 1024
    return 0;
}`

// 背景到窗口的距离（px）
export const PADDINGS = [
  { id: 's', label: 'S', px: 32 },
  { id: 'm', label: 'M', px: 64 },
  { id: 'l', label: 'L', px: 96 },
]

// background 为 'none' 表示无背景
export const DEFAULT_SETTINGS = {
  theme: 'vitesse-dark',
  background: 'sunset',
  padding: 'm',
  lineNumbers: true,
  code: DEFAULT_CODE,
  filename: DEFAULT_FILENAME,
}
