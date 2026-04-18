import Head from 'next/head'
import { FlirtingGameContextProvider } from 'components/flirting-game/context/FlirtingGameContext'
import { FlirtingGamePage } from 'components/flirting-game/FlirtingGamePage'

export default function FlirtingGameRoute() {
  return (
    <>
      <Head>
        <title>The Flirting Game</title>
        <meta name="description" content="An interactive flirting practice game. Get slick or get roasted." />
        <meta name="robots" content="noindex" />
      </Head>
      <FlirtingGameContextProvider>
        <FlirtingGamePage />
      </FlirtingGameContextProvider>
    </>
  )
}
