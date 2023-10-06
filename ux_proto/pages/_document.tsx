import React from "react";
import { Html, Head, Main, NextScript } from "next/document";

export default function Document()
{
    return (
        <Html lang="en">
            <Head>
                <meta name="description" content="Wingman Demo" />
            </Head>
            <body className="overflow-x-hidden">
                <Main />
                <NextScript />
            </body>
        </Html>
    );
}
