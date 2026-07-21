import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const page = read("src/app/risk-share/manager/share-review/page.tsx");
const client = read("src/app/risk-share/manager/share-review/ShareReviewClient.tsx");
const manager = read("src/components/risk-share/manager/ManagerDesignerView.tsx");
const publish = read("src/app/risk-share/manager/share-review/publish/PublishClient.tsx");

const checks = [
  ["customer-facing name", [page, client, manager, publish].every((text) => !text.includes("공유할 내용 확인")) && page.includes("공유할 위험성평가")],
  ["workflow order", client.includes("1. 내용 검토") && client.includes("2. 게시 항목 선택") && client.includes("3. 현장 QR 공유")],
  ["existing-state summary only", ["확인 필요", "확인 완료", "공유 제외", "게시 완료"].every((label) => client.includes(label))],
  ["publish remains explicit", client.includes("항목을 자동 선택하지 않으며") && client.includes("게시할 항목 선택")],
  ["no lifecycle claims", !client.includes("재확인 필요") && !client.includes("공유 종료") && !client.includes("rollback")],
  ["no internal product shorthand", !client.includes("위공팩") && !manager.includes("위공팩")],
];

const failed = checks.filter(([, ok]) => !ok);
for (const [name, ok] of checks) console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
if (failed.length) process.exit(1);
console.log("PASS risk-share manager share workflow UI contract");
