export const metadata = {
  title: "조선대학교 언론 관리 플랫폼",
  description: "조선대학교 보도자료 성과 관리 및 언론 모니터링 플랫폼",
  icons: {
    icon: "/assets/chosun-symbol-basic.jpg",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <head>
        <meta httpEquiv="Cache-Control" content="no-store" />
        <meta httpEquiv="Pragma" content="no-cache" />
        <meta httpEquiv="Expires" content="0" />
        <link rel="stylesheet" href="/styles.css?v=20260724-deploy-v1" />
      </head>
      <body>{children}</body>
    </html>
  );
}
