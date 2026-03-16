<?xml version="1.0" encoding="utf-8"?>
<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:atom="http://www.w3.org/2005/Atom">
  <xsl:output method="html" version="1.0" encoding="UTF-8" indent="yes"/>
  <xsl:template match="/">
    <html lang="en">
      <head>
        <meta charset="utf-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
        <title><xsl:value-of select="/rss/channel/title"/> — RSS Feed</title>
        <link rel="preconnect" href="https://fonts.googleapis.com"/>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin=""/>
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&amp;family=Special+Elite&amp;family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&amp;display=swap" rel="stylesheet"/>
        <style>
          :root {
            --paper: #f5ecd7;
            --paper-dark: #e8dcc6;
            --ink: #1a1a1a;
            --red: #b91c1c;
            --red-dark: #7f1d1d;
            --gold: #b8860b;
          }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: "Libre Baskerville", "Georgia", serif;
            background: var(--paper);
            color: var(--ink);
            min-height: 100vh;
            line-height: 1.7;
          }
          .header {
            text-align: center;
            padding: 2rem 1rem 1rem;
            border-bottom: 4px double var(--red);
            margin-bottom: 2rem;
          }
          .title {
            font-family: "Playfair Display", serif;
            font-weight: 900;
            font-size: clamp(2rem, 6vw, 3.5rem);
            color: var(--red-dark);
            text-shadow: 2px 2px 0 #b8860b;
            line-height: 1;
          }
          .subtitle {
            font-family: "Special Elite", cursive;
            font-size: 0.9rem;
            color: var(--gold);
            letter-spacing: 0.3em;
            text-transform: uppercase;
            margin-top: 0.5rem;
          }
          .notice {
            font-family: "Special Elite", cursive;
            font-size: 0.85rem;
            color: var(--gold);
            text-align: center;
            margin-bottom: 2rem;
            letter-spacing: 0.05em;
          }
          .notice strong { color: var(--red-dark); }
          .container {
            max-width: 52rem;
            margin: 0 auto;
            padding: 0 1.5rem 4rem;
          }
          .items { list-style: none; }
          .item {
            border-bottom: 1px solid var(--paper-dark);
          }
          .item:first-child {
            border-top: 1px solid var(--paper-dark);
          }
          .item a {
            display: flex;
            justify-content: space-between;
            align-items: baseline;
            gap: 1rem;
            padding: 1.25rem 0.5rem;
            text-decoration: none;
            color: var(--ink);
            transition: background 0.15s;
          }
          .item a:hover {
            background: var(--paper-dark);
          }
          .item-title {
            font-family: "Playfair Display", serif;
            font-weight: 700;
            font-size: 1.4rem;
            color: var(--red-dark);
            line-height: 1.3;
          }
          .item a:hover .item-title {
            text-decoration: underline;
            text-decoration-style: wavy;
            text-underline-offset: 3px;
          }
          .item-date {
            font-family: "Special Elite", cursive;
            font-size: 0.85rem;
            color: var(--gold);
            white-space: nowrap;
            flex-shrink: 0;
          }
          .footer {
            text-align: center;
            padding: 2rem 1rem;
            border-top: 4px double var(--red);
            margin-top: 3rem;
            font-family: "Special Elite", cursive;
            font-size: 0.85rem;
            color: var(--gold);
            letter-spacing: 0.15em;
          }
        </style>
      </head>
      <body>
        <header class="header">
          <h1 class="title"><a style="color: inherit; text-decoration: none;">
            <xsl:attribute name="href"><xsl:value-of select="/rss/channel/link"/></xsl:attribute>
            <xsl:value-of select="/rss/channel/title"/>
          </a></h1>
          <p class="subtitle"><xsl:value-of select="/rss/channel/description"/></p>
        </header>
        <main class="container">
          <p class="notice">This is an <a href="https://aboutfeeds.com/" style="color: var(--red); text-decoration-style: wavy; text-underline-offset: 3px;">RSS feed</a>. Copy the URL into your reader to subscribe.</p>
          <ul class="items">
            <xsl:for-each select="/rss/channel/item">
              <li class="item">
                <a>
                  <xsl:attribute name="href">
                    <xsl:value-of select="link"/>
                  </xsl:attribute>
                  <span class="item-title"><xsl:value-of select="title"/></span>
                  <span class="item-date"><xsl:value-of select="pubDate"/></span>
                </a>
              </li>
            </xsl:for-each>
          </ul>
        </main>
        <footer class="footer">
          © Howery's Review • All Rights Reserved
        </footer>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
