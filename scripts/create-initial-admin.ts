import { bootstrapAdmin } from "../src/server/admin/bootstrap";

function argument(name: string) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const employeeNumber = argument("employee-number");
const name = argument("name");
const password = process.env.INITIAL_ADMIN_PASSWORD;

if (!employeeNumber || !name || !password) {
  console.error("사용법: INITIAL_ADMIN_PASSWORD를 설정하고 --employee-number, --name을 입력하세요.");
  process.exit(1);
}

const admin = await bootstrapAdmin({ employeeNumber, name, password });
console.log(`초기 관리자 생성: ${admin.employeeNumber} / ${admin.name}`);
process.exit(0);
