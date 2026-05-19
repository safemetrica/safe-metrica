import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: "SafeMetrica™",
	description: "산업안전 운영 플랫폼",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html
			lang="ko"
			className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
		>
			<body className="min-h-full flex flex-col">
				<Providers>
					<main className="flex-1">{children}</main>

					<footer className="border-t border-white/10 bg-black/70 text-white">
						<div className="mx-auto w-full max-w-6xl px-4 py-6 text-xs leading-5 text-white/80">
							<div>
          <div className="mb-3 border-b border-white/10 pb-3 text-center">
            <p className="text-sm font-black text-white">SafeMetrica™</p>
            <p className="mt-1 text-xs font-semibold text-slate-100">
              © 2026 SafeMetrica™. All rights reserved.
            </p>
            <p className="mt-1 text-xs font-bold text-blue-100">
              등록 저작물 기반 보고서·프로세스 구조 적용 · C-2026-003550 · C-2026-013731
            </p>
          </div>
								사업자명: 레인보우비즈컨설팅 | 대표: 김진형 | 사업자등록번호:
								787-36-01366 | 통신판매업신고번호: 제 2026-인천연수구-1103호
							</div>
							<div>
								주소: 인천광역시 연수구 인천타워대로 185, 1540호 (송도동, 송도
								센트럴비즈 한라)
							</div>
							<div>
								문의:{" "}
								<a
									className="underline underline-offset-2"
									href="mailto:tirany2014@gmail.com"
								>
									tirany2014@gmail.com
								</a>
								{" "}·{" "}
								<a
									className="underline underline-offset-2"
									href="https://obtainable-end-976.notion.site/SafeMetrica-e9e062cb41314b14b1ae0e186e9b496f?source=copy_link"
									target="_blank"
									rel="noreferrer"
								>
									이용약관·개인정보처리방침
								</a>
							</div>
						</div>
					</footer>
				</Providers>
			</body>
		</html>
	);
}
