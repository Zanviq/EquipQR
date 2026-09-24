import { seedDemo } from "../src/server/demo/seed";

const result = await seedDemo();
console.log(`데모 데이터: 계정 ${result.userCreated ? "생성" : "유지"}, 장비 ${result.equipmentCreated}개 생성`);
process.exit(0);
