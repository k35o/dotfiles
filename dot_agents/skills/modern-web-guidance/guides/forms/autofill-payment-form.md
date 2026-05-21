# ベストプラクティスに従った支払いフォームの構築

支払いフォームは、チェックアウトプロセスの中で最も重要な部分です。支払いフォームのデザインが不十分だと、ショッピングカートの放棄の一般的な原因になります。

デスクトップでもモバイルでも、ユーザーが支払い情報をできるだけ簡単に入力できるフォームを作成します。フォームがオートフィル、バリデーション、データ入力制約のための組み込みブラウザ機能を最大限活用するようにしてください。

## 実装方法

成功する支払いフォームを構築するための最も重要なガイドラインを以下に示します。

### 意味のある、有効なHTMLを使用する

フォームを作るために用意された要素や属性を最大限に活用しましょう:

- `<form>`、`<input>`、`<label>`、`<button>`
- `type`、`autocomplete`、`inputmode`

これらは組み込みのブラウザ機能を有効にし、アクセシビリティを向上させ、マークアップに意味を加えます。

### <label>要素を使用してデータ入力用のフォームフィールドにラベルを付ける

`<input>`、`<select>`、`<textarea>`にラベルを付けるには、`<label>`を使用してください。ラベルの`for`属性に入力の`id`と同じ値を与えることで、ラベルを入力に関連付けます。

### HTML属性を最大限に活用する

適切な`<input>`要素の`<type>`属性を使用してモバイルで適切なキーボードを提供し、ブラウザによる基本的な組み込みバリデーションを有効にすることで、ユーザーがデータを入力しやすくしましょう。

メールアドレスには常に`type="email"`を、電話番号には常に`type="tel"`を使用してください。

```html
<!-- type="email"/"tel" gives mobile users the right keyboard and enables built-in validation -->
<input type="email" id="email" name="email" autocomplete="email" required />
<input type="tel" id="phone" name="phone" autocomplete="tel" />
```

すべての`<input>`、`<select>`、`<textarea>`要素には、アクセシビリティを向上させ、ユーザーがデータを再入力する必要を避けるために、適切な`autocomplete`属性を付けるべきです。

### ボタンを役立つものにする

ボタンには`<button>`を使用してください。`<input type="submit">`を使用することもできますが、`div`やその他の任意の要素をボタンとして使用しないでください。ボタン要素は、アクセシブルな挙動、組み込みのフォーム送信機能を提供し、簡単にスタイル付けできます。

各フォーム送信ボタンには、その動作を示す値を与えてください。チェックアウトに向けた各ステップで、進行状況を示し、次のステップを明確にする説明的な行動喚起を使用してください。例えば、配送先住所フォームの送信ボタンには、**Continue**や**Save**ではなく、**Proceed to Payment**とラベル付けします。

### 可能な場合は単一の名前入力を使用する

姓、名、敬称、その他の名前の部分を別々に保存する正当な理由がない限り、ユーザーが単一の入力で名前を入力できるようにしてください。単一の名前入力を使用すると、フォームの複雑さが軽減され、コピー&ペーストが可能になり、オートフィルが簡単になります。

国際的な名前を許容してください。バリデーションには、ラテン文字のみに一致する正規表現を使用しないでください。ラテン文字のみだと、ラテンアルファベットにない文字を含む名前や住所を持つユーザーが除外されます。代わりにUnicodeレターのマッチングを許可し、バックエンドが入力と出力の両方でUnicodeを安全にサポートしていることを確認してください。正規表現におけるUnicodeはモダンブラウザで十分にサポートされています。

### さまざまな住所形式を許容する

支払いフォームに住所のフォームフィールドを追加する際は、単一の国内であってもさまざまな住所形式があることに注意してください。「通常の」住所について憶測しないでください。

データ要件の範囲内で可能であれば、住所には単一の`<textarea>`要素を使用することを検討してください。これは、さまざまな国内および国際的な住所形式に対して最も柔軟な選択肢です。

### 請求先住所のためにautocompleteを使用する

デフォルトでは、請求先住所を配送先住所と同じに設定してください。請求先住所をフォームで表示するのではなく、編集用のリンク(またはsummaryとdetails要素)を提供することで、視覚的な煩雑さを減らしてください。

配送先住所と同様に、請求先住所にも適切なautocomplete値を使用することで、ユーザーがデータを複数回入力する必要がなくなります。同じ名前の入力に異なる値を持つ異なるセクションがある場合は、autocomplete属性にプレフィックスワードを追加します。例えば:

```
<input autocomplete="shipping address-line-1" ...>
...
<input autocomplete="billing address-line-1" ...>
```

### チェックアウトの進行状況を表示する

支払いに向けた各ステップで、今すべきこと、次のチェックアウトステップが何であるかを明確にするページ見出しと説明的なボタン値を使用してください。

フォーム入力で`enterkeyhint`属性を使用して、モバイルキーボードのEnterキーラベルを設定してください。例えば、複数ページのフォーム内では`enterkeyhint="previous"`や`enterkeyhint="next"`を使用し、フォームの最後の入力には`enterkeyhint="done"`、検索入力には`enterkeyhint="search"`を使用します。

### ユーザーが支払いデータを再入力する手間を省く

支払いカードフォームに必ず適切な`autocomplete`値を追加してください。autocompleteがないと、ユーザーは支払いカードの詳細を物理的に記録したり、安全でない方法で保管したりすることになります。

```html
<!-- cc-number tells autofill this is a card number, not a generic number field -->
<!-- inputmode="numeric" gives a numeric keyboard without the increment/decrement spinner -->
<!-- DO NOT use type="number" — it adds increment/decrement controls and strips leading zeros -->
<input
  id="cc-number"
  name="cc-number"
  type="text"
  autocomplete="cc-number"
  inputmode="numeric"
  maxlength="19"
  pattern="[\d ]{13,19}"
  required
/>

<!-- cc-name autofills with the name exactly as it appears on the card; Unicode pattern allows international names -->
<input
  id="cc-name"
  name="cc-name"
  type="text"
  autocomplete="cc-name"
  maxlength="50"
  pattern="[\p{L} \-\.]+"
  required
/>

<!-- cc-exp autofills the full expiry date as MM/YY -->
<!-- MANDATORY: Place format hints above the input so autocomplete popovers or virtual keyboards do not obscure them during editing -->
<span id="exp-hint" class="hint">Format: MM/YY</span>
<input
  id="cc-exp"
  name="cc-exp"
  type="text"
  autocomplete="cc-exp"
  aria-describedby="exp-hint"
  maxlength="5"
  required
/>

<!-- cc-csc autofills the security code; DO NOT use type="password" here -->
<input
  id="cc-csc"
  name="cc-csc"
  type="text"
  autocomplete="cc-csc"
  inputmode="numeric"
  maxlength="4"
  pattern="[0-9]{3,4}"
  required
/>
```

### 支払いカードや電話番号には単一の入力を使用する

支払いカードと電話番号には単一の入力を使用してください。番号を複数のパーツに分割しないでください。これにより、ユーザーのデータ入力が簡単になり、バリデーションも単純になり、ブラウザのオートフィルが可能になります。PINや銀行コードなど、他の数値データについても同様に検討してください。

### 慎重にバリデーションする

データ入力は、リアルタイムでもフォーム送信前でもバリデーションする必要があります。これを行う1つの方法は、支払いカード入力に`pattern`属性を追加することです。ユーザーが無効な値で支払いフォームを送信しようとすると、ブラウザは警告メッセージを表示し、入力にフォーカスを設定します。

ただし、`pattern`の正規表現は、支払いカード番号の長さの範囲(14桁(またはそれ以下)から20桁(またはそれ以上))を扱えるように十分柔軟である必要があります。カードのセキュリティコード(CSC、CVC、CVVなどとも呼ばれる)は3桁または4桁です。

新しい支払いカード番号を入力する際にスペースを含めることを許可してください。これは物理カードに番号が表示される方法であるためです。これによりユーザーフレンドリーになり(「何か間違ったことをした」と伝える必要がなくなり)、コンバージョンフローを中断する可能性が低くなり、処理前に番号からスペースを削除するのは簡単です。

### ユーザーがうっかりデータフィールドを見逃すのを防ぐ

必須フィールドには`required`属性を追加してください。モダンブラウザは、不足しているデータに対して自動的にプロンプトを表示しフォーカスを設定します。

## フォールバック戦略

Baseline status for enterkeyhint: Widely available. It's been Baseline since 2021-11-02.
Supported by: Chrome 77 (Sep 2019), Edge 79 (Jan 2020), Firefox 94 (Nov 2021), Safari 13.1 (Mar 2020), and Safari iOS 13.4 (Mar 2020).
Baseline status for Email, telephone, and URL <input> types: Widely available. It's been Baseline since 2015-07-29.
Supported by: Chrome 5 (May 2010), Edge 12 (Jul 2015), Firefox 4 (Mar 2011), Safari 5 (Jun 2010), and Safari iOS 3 (Jun 2009).
Baseline status for inputmode: Widely available. It's been Baseline since 2021-12-07.
Supported by: Chrome 66 (Apr 2018), Edge 79 (Jan 2020), Firefox 95 (Dec 2021), Safari 12.1 (Mar 2019), and Safari iOS 12.2 (Mar 2019).

オートフィルはプログレッシブエンハンスメントです。オートフィルをサポートしないブラウザでは、ユーザーは単に手動で支払い情報を入力する必要があります。セマンティックなHTMLの制約(`type`、`inputmode`、`pattern`、`required`など)は、ユーザー入力のバリデーションと適切な仮想キーボードの提供のために、引き続き適切に機能します。
