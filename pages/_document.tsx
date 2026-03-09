import {
  Head,
  Html,
  Main,
  NextScript,
} from 'next/document'

// App Router handles the document structure for runtime pages, but an explicit
// pages/_document entry keeps Next's production build from failing when it
// resolves internal Pages Router fallbacks.
export default function Document() {
  return (
    <Html lang="en">
      <Head />
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
