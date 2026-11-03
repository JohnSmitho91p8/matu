// 各语言的典型代码样例，供语言识别测试使用
export const SAMPLES = {
  cpp: [
    `#include <iostream>
#include <vector>
using namespace std;

int main() {
    vector<int> a = {3, 1, 2};
    sort(a.begin(), a.end());
    for (int x : a) cout << x << " ";
    return 0;
}`,
    `template <typename T>
T add(T a, T b) {
    return a + b;
}
int main() { std::cout << add(1, 2) << std::endl; }`,
    `#include <bits/stdc++.h>
using namespace std;
int main() { int n; cin >> n; cout << n * 2 << endl; }`,
  ],
  c: [
    `#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int n;
    scanf("%d", &n);
    int *arr = malloc(n * sizeof(int));
    for (int i = 0; i < n; i++) arr[i] = i * i;
    printf("%d\\n", arr[n - 1]);
    free(arr);
    return 0;
}`,
    `#include <stdio.h>
int main() {
    printf("hello\\n");
    return 0;
}`,
  ],
  python: [
    `import sys
from collections import deque

def bfs(graph, start):
    seen = {start}
    q = deque([start])
    while q:
        u = q.popleft()
        for v in graph[u]:
            if v not in seen:
                seen.add(v)
                q.append(v)
    return seen

if __name__ == "__main__":
    print(bfs({1: [2, 3], 2: [], 3: []}, 1))`,
    `class Stack:
    def __init__(self):
        self.items = []

    def push(self, x):
        self.items.append(x)`,
    `for i in range(10):
    if i % 2 == 0:
        print(i)
    elif i == 5:
        pass`,
  ],
  java: [
    `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        List<Integer> list = new ArrayList<>();
        for (int i = 0; i < n; i++) list.add(i);
        System.out.println(list);
    }
}`,
    `public class Hello {
    @Override
    public String toString() { return "hi"; }
}`,
  ],
  javascript: [
    `const nums = [1, 2, 3];
const doubled = nums.map((x) => x * 2);

function sum(arr) {
  return arr.reduce((a, b) => a + b, 0);
}

console.log(sum(doubled));
document.title = "demo";`,
    `const fs = require('fs');
module.exports = { read: (p) => fs.readFileSync(p, 'utf8') };`,
    `export default function App() {
  const [n, setN] = useState(0);
  return n === 0 ? null : n;
}`,
  ],
}
