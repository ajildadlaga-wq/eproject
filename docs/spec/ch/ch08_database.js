// ch/ch08_database.js — Бүлэг 8. Өгөгдлийн сангийн загвар
const { setChapter, P, H1, H2, H3, TBL, FIG, NOTE } = require('../lib/doc');

module.exports = function chapter8() {
  setChapter(8);
  const c = [];
  const add = (...x) => c.push(...x.flat());

  add(H1('8. Өгөгдлийн сангийн загвар (Database Design)'));

  add(NOTE('Зорилго.',
    'Энэ бүлэг нь класс диаграмыг реляц өгөгдлийн сангийн бүтэц болгон хөрвүүлсэн үр дүнг харуулна. ER диаграм, өгөгдлийн толь бичиг (Data Dictionary), нормчлолын түвшин болон бүрэн бүтэн байдлын дүрмийг тодорхойлно. Систем PostgreSQL өгөгдлийн санг ашиглана.'));

  // ------------------------------------------------------------------ 8.1
  add(H2('8.1 ER диаграм (Entity Relationship Diagram)'));
  add(P('Найман хүснэгт нь системийн бүх өгөгдлийг хадгална. Сум нь гадаад түлхүүрийн (foreign key) холбоосыг, «1:N» тэмдэглэгээ нь нэг мөрөнд олон мөр харгалзахыг илэрхийлнэ. Уншихад хялбар байлгах үүднээс диаграмыг хоёр хэсэгт хуваав.'));

  add(H3('8.1.1 Үндсэн хүснэгтүүд'));
  add(FIG('fig/f_erd_core.png', 'Үндсэн хүснэгтүүдийн ER диаграм.', 520));
  add(P('Дөрвөн хүснэгт нь системийн үндсэн урсгалыг хадгална. **tasks** хүснэгт нь `profiles` руу хоёр удаа холбогдож байгааг анзаараарай: `assignee_id` нь ажлыг гүйцэтгэгчийг, `reviewed_by` нь баталсан менежерийг заана. Энэ хоёр багана хэзээ ч нэг хүнийг заахгүй байх нь системийн үндсэн дүрмийн өгөгдлийн сан дахь илэрхийлэл юм.'));

  add(H3('8.1.2 Бүртгэл ба тодорхойлолтын хүснэгтүүд'));
  add(FIG('fig/f_erd_support.png', 'Бүртгэл ба тодорхойлолтын хүснэгтүүдийн ER диаграм.', 440));
  add(P('Саарал өнгөтэй хүснэгтүүд Зураг 8.1-д бүрэн тодорхойлогдсон. `task_updates` ба `audit_log` нь өнгөрсөн үйлдлийн баримт; `requirements` ба `risks` нь төслийн агуулгыг хадгална.'));

  // ------------------------------------------------------------------ 8.2
  add(H2('8.2 Data Dictionary (Өгөгдлийн толь бичиг)'));

  add(H3('8.2.1 profiles — хэрэглэгчийн профайл'));
  add(TBL({
    caption: 'profiles хүснэгтийн бүтэц.',
    size: 18,
    head: ['Талбар', 'Төрөл', 'Хязгаарлалт', 'Тайлбар'],
    widths: [20, 20, 18, 42],
    firstColBold: true,
    rows: [
      ['id', 'uuid', 'PK', 'Нэвтрэлтийн бүртгэлийн дугаартай ижил.'],
      ['full_name', 'text', '', 'Хэрэглэгчийн бүтэн нэр.'],
      ['role', 'app_role', 'NOT NULL', 'ADMIN, PROJECT_MANAGER, TEAM_MEMBER, VIEWER.'],
      ['created_at', 'timestamptz', 'DEFAULT now()', 'Бүртгэл үүссэн хугацаа.'],
    ],
  }));

  add(H3('8.2.2 projects — төсөл'));
  add(TBL({
    caption: 'projects хүснэгтийн бүтэц.',
    size: 18,
    head: ['Талбар', 'Төрөл', 'Хязгаарлалт', 'Тайлбар'],
    widths: [20, 20, 18, 42],
    firstColBold: true,
    rows: [
      ['id', 'uuid', 'PK', 'Төслийн дугаар.'],
      ['name', 'text', 'NOT NULL', 'Төслийн нэр.'],
      ['description', 'text', '', 'Товч тайлбар.'],
      ['sdlc_phase', 'sdlc_phase', "DEFAULT 'REQUIREMENTS'", 'Хөгжүүлэлтийн үе шат.'],
      ['start_date', 'date', '', 'Эхлэх огноо. Gantt-д шаардлагатай.'],
      ['end_date', 'date', '', 'Дуусах огноо.'],
      ['manager_id', 'uuid', 'FK → profiles', 'Төслийн эзэн. Батлах эрх түүнд байна.'],
    ],
  }));

  add(H3('8.2.3 tasks — ажил'));
  add(P('Системийн гол хүснэгт. Баталгаажуулалтын урсгалын бүх мэдээлэл энд хадгалагдана.'));
  add(TBL({
    caption: 'tasks хүснэгтийн бүтэц.',
    size: 18,
    head: ['Талбар', 'Төрөл', 'Хязгаарлалт', 'Тайлбар'],
    widths: [20, 20, 18, 42],
    firstColBold: true,
    rows: [
      ['id', 'uuid', 'PK', 'Ажлын дугаар.'],
      ['project_id', 'uuid', 'FK → projects', 'Харьяалагдах төсөл. Төсөл устгагдвал ажил устана.'],
      ['name', 'text', 'NOT NULL', 'Ажлын нэр.'],
      ['status', 'task_status', "DEFAULT 'DRAFT'", 'Найман төлөвийн нэг. Зөвхөн APPROVED явцад тооцогдоно.'],
      ['priority', 'priority_level', "DEFAULT 'MEDIUM'", 'Явцын жинг тодорхойлно.'],
      ['percent_complete', 'int', '0–99', 'Гүйцэтгэгчийн мэдээлсэн явц. 100 болох боломжгүй.'],
      ['planned_start', 'date', '', 'Төлөвлөсөн эхлэх огноо.'],
      ['planned_end', 'date', '', 'Төлөвлөсөн дуусах огноо. Хугацаа хэтрэлтийг үүгээр тооцно.'],
      ['actual_start', 'date', '', 'Бодит эхэлсэн огноо.'],
      ['actual_end', 'date', '', 'Бодит дууссан огноо.'],
      ['assignee_id', 'uuid', 'FK → profiles', 'Хариуцагч. Зөвхөн тэрээр хянуулахаар илгээнэ.'],
      ['depends_on', 'uuid[]', '', 'Өмнө дуусах ёстой ажлуудын дугаар.'],
      ['submitted_at', 'timestamptz', '', 'Хянуулахаар илгээсэн хугацаа.'],
      ['reviewed_by', 'uuid', 'FK → profiles', 'Хянасан менежер.'],
      ['reviewed_at', 'timestamptz', '', 'Хянасан хугацаа.'],
      ['review_note', 'text', '', 'Буцаах үед заавал бичигдэнэ.'],
    ],
  }));

  add(H3('8.2.4 project_members — төслийн гишүүнчлэл'));
  add(TBL({
    caption: 'project_members хүснэгтийн бүтэц.',
    size: 18,
    head: ['Талбар', 'Төрөл', 'Хязгаарлалт', 'Тайлбар'],
    widths: [20, 20, 18, 42],
    firstColBold: true,
    rows: [
      ['project_id', 'uuid', 'PK, FK → projects', 'Хосолсон анхдагч түлхүүрийн нэг хэсэг.'],
      ['user_id', 'uuid', 'PK, FK → profiles', 'Нэг хүн нэг төсөлд нэг л удаа гишүүн байна.'],
      ['member_role', 'member_role', "DEFAULT 'VIEWER'", 'TEAM_MEMBER эсвэл VIEWER.'],
    ],
  }));

  add(H3('8.2.5 task_updates — явцын түүх'));
  add(TBL({
    caption: 'task_updates хүснэгтийн бүтэц.',
    size: 18,
    head: ['Талбар', 'Төрөл', 'Хязгаарлалт', 'Тайлбар'],
    widths: [20, 20, 18, 42],
    firstColBold: true,
    rows: [
      ['id', 'uuid', 'PK', 'Бичлэгийн дугаар.'],
      ['task_id', 'uuid', 'FK → tasks', 'Холбогдох ажил.'],
      ['project_id', 'uuid', 'FK → projects', 'Шүүлт хийхэд ашиглана.'],
      ['user_id', 'uuid', 'FK → profiles', 'Шинэчилсэн хүн.'],
      ['user_name', 'text', '', 'Тухайн үеийн нэр. Хэрэглэгч устгагдсан ч түүх уншигдана.'],
      ['progress_before', 'int', '', 'Өмнөх явц.'],
      ['progress_after', 'int', '', 'Шинэ явц.'],
      ['what_happened', 'text', '', 'Юу хийсэн.'],
      ['why_changed', 'text', '', 'Ямар шалтгаантай.'],
    ],
  }));

  add(H3('8.2.6 audit_log — аудитын бүртгэл'));
  add(TBL({
    caption: 'audit_log хүснэгтийн бүтэц.',
    size: 18,
    head: ['Талбар', 'Төрөл', 'Хязгаарлалт', 'Тайлбар'],
    widths: [20, 20, 18, 42],
    firstColBold: true,
    rows: [
      ['id', 'bigserial', 'PK', 'Дараалсан дугаар. Завсар үүсвэл бичлэг алдагдсаныг илтгэнэ.'],
      ['occurred_at', 'timestamptz', 'DEFAULT now()', 'Үйлдэл хийгдсэн хугацаа.'],
      ['actor_id', 'uuid', 'FK → profiles', 'Үйлдэл хийсэн хүн.'],
      ['actor_name', 'text', '', 'Тухайн үеийн нэр.'],
      ['actor_role', 'text', '', 'Тухайн үеийн үүрэг.'],
      ['action', 'text', 'NOT NULL', 'TASK_APPROVED, TASK_REJECTED, ROLE_CHANGED гэх мэт.'],
      ['entity', 'text', 'NOT NULL', 'task, project, profile.'],
      ['entity_id', 'uuid', '', 'Обьектын дугаар.'],
      ['project_id', 'uuid', 'FK → projects', 'Хандах эрхийг шалгахад ашиглана.'],
      ['summary', 'text', '', 'Хүн уншихад зориулсан товч тайлбар.'],
      ['detail', 'jsonb', '', 'Нэмэлт мэдээлэл: шалтгаан, өмнөх ба шинэ утга.'],
    ],
  }));

  add(H3('8.2.7 requirements ба risks'));
  add(TBL({
    caption: 'requirements болон risks хүснэгтийн гол талбар.',
    size: 18,
    head: ['Хүснэгт', 'Талбар', 'Төрөл', 'Тайлбар'],
    widths: [22, 22, 20, 36],
    firstColBold: true,
    rows: [
      ['requirements', 'type', 'requirement_type', 'BUSINESS, FUNCTIONAL, NON_FUNCTIONAL.'],
      ['requirements', 'status', 'requirement_status', 'DRAFT → BASELINED → APPROVED → IMPLEMENTED → VERIFIED.'],
      ['requirements', 'baseline_version', 'int', 'Тогтоосон хувилбарын дугаар.'],
      ['risks', 'probability', 'int', 'Магадлал 1–5.'],
      ['risks', 'impact', 'int', 'Нөлөө 1–5.'],
      ['risks', 'priority', 'priority_level', 'Магадлал × нөлөө томьёогоор автоматаар тооцогдоно.'],
      ['risks', 'status', 'risk_status', 'OPEN, MITIGATING, CLOSED.'],
    ],
  }));

  // ------------------------------------------------------------------ 8.3
  add(H2('8.3 Тоочмол төрлүүд (Enumerated Types)'));
  add(P('Утгын хязгаарлагдмал багцыг тэмдэгт мөрөөр хадгалахын оронд өгөгдлийн сангийн тоочмол төрлөөр тодорхойлов. Ингэснээр буруу утга огт орох боломжгүй болно.'));
  add(TBL({
    caption: 'Тоочмол төрлүүд.',
    size: 18,
    head: ['Төрөл', 'Утгууд'],
    widths: [26, 74],
    firstColBold: true,
    rows: [
      ['app_role', 'ADMIN · PROJECT_MANAGER · TEAM_MEMBER · VIEWER'],
      ['member_role', 'TEAM_MEMBER · VIEWER'],
      ['task_status', 'DRAFT · ASSIGNED · IN_PROGRESS · BLOCKED · COMPLETED · UNDER_REVIEW · APPROVED · REJECTED'],
      ['priority_level', 'LOW · MEDIUM · HIGH · CRITICAL'],
      ['sdlc_phase', 'REQUIREMENTS · DEVELOPMENT · UAT · SYSTEM_TESTING · STAGING · DEPLOYMENT'],
      ['requirement_type', 'BUSINESS · FUNCTIONAL · NON_FUNCTIONAL'],
      ['requirement_status', 'DRAFT · BASELINED · APPROVED · IMPLEMENTED · VERIFIED'],
      ['risk_category', 'TECHNICAL · SCHEDULE · COST · RESOURCE · SCOPE · EXTERNAL'],
      ['risk_status', 'OPEN · MITIGATING · CLOSED'],
    ],
  }));

  // ------------------------------------------------------------------ 8.4
  add(H2('8.4 Нормчлол (Normalization)'));
  add(P('Өгөгдлийн сан гуравдугаар хэвийн хэлбэрт (3NF) нийцнэ.'));
  add(TBL({
    caption: 'Нормчлолын түвшний шалгалт.',
    size: 19,
    head: ['Түвшин', 'Шаардлага', 'Хэрхэн хангагдсан'],
    widths: [12, 34, 54],
    firstColBold: true,
    rows: [
      ['1NF', 'Талбар бүр атомик утгатай байх.', 'Бүх талбар нэг утга хадгална. Ганц үл хамаарах зүйл нь `depends_on` массив бөгөөд энэ нь PostgreSQL-ийн төрөлжсөн боломж ба хайлтын гүйцэтгэлийн үүднээс зориудаар сонгогдсон.'],
      ['2NF', 'Анхдагч бус талбар бүрэн түлхүүрээс хамаарах.', '`project_members` хүснэгт хосолсон түлхүүртэй бөгөөд `member_role` нь хоёулангаас нь хамаарна.'],
      ['3NF', 'Анхдагч бус талбарууд хоорондоо хамаарахгүй.', 'Ажлын явц статусаас тусдаа хадгалагдана. Эрсдэлийн `priority` нь `probability` ба `impact`-аас тооцогддог тул давхардал үүсэх боловч уншилтын гүйцэтгэлийн үүднээс хадгалж, триггерээр синхрончилно.'],
    ],
  }));

  add(NOTE('Зориудын давхардал.',
    '`task_updates.user_name` болон `audit_log.actor_name` талбарууд нь `profiles` хүснэгтээс уншиж болох мэдээллийг давхардуулан хадгалж байна. Энэ нь нормчлолын зөрчил боловч зориудаар хийгдсэн: хэрэглэгчийн бүртгэл устгагдсан ч аудитын бүртгэл «хэн хийсэн» гэдгээ мэдэж байх ёстой. Аудитын бүртгэл нь тухайн үеийн баримт бөгөөд одоогийн байдлын тусгал биш.'));

  // ------------------------------------------------------------------ 8.5
  add(H2('8.5 Бүрэн бүтэн байдал ба аюулгүй байдал'));
  add(TBL({
    caption: 'Өгөгдлийн бүрэн бүтэн байдлын дүрэм.',
    size: 19,
    head: ['Дүрэм', 'Хэрэгжүүлэлт'],
    widths: [34, 66],
    firstColBold: true,
    rows: [
      ['Төсөл устгахад ажил устана', 'ON DELETE CASCADE гадаад түлхүүр.'],
      ['Хэрэглэгч устгахад ажил үлдэнэ', 'ON DELETE SET NULL. Ажил хариуцагчгүй болох ч алга болохгүй.'],
      ['Явц 0–99 хооронд байх', 'update_task_progress функц дотор хязгаарлагдана.'],
      ['Статусын шилжилт зөв байх', 'submit_task, approve_task, reject_task функцүүд шалгана.'],
      ['Хэрэглэгч өөрийн эрхийг өөрчлөхгүй', 'profiles хүснэгтэд триггер.'],
      ['Аудитын бичлэг өөрчлөгдөхгүй', 'authenticated үүрэгт INSERT, UPDATE, DELETE эрх олгоогүй. Бичилт зөвхөн SECURITY DEFINER функцээр.'],
      ['Хэрэглэгч зөвхөн өөрт зөвшөөрөгдсөнийг харна', 'Хүснэгт бүрт мөрийн түвшний аюулгүй байдал (RLS) идэвхтэй.'],
    ],
  }));

  add(TBL({
    caption: 'Мөрийн түвшний аюулгүй байдлын бодлого.',
    size: 19,
    head: ['Үүрэг', 'SELECT', 'INSERT / UPDATE', 'DELETE'],
    widths: [28, 24, 26, 22],
    firstColBold: true,
    rows: [
      ['Системийн админ', 'Бүх төсөл', '—', '—'],
      ['Төслийн менежер', 'Өөрийн төсөл', 'Өөрийн төсөл', 'Өөрийн төсөл'],
      ['Багийн гишүүн', 'Гишүүн байгаа төсөл', 'Гишүүн байгаа төсөл', '—'],
      ['Ажиглагч', 'Нээгдсэн төсөл', '—', '—'],
    ],
  }));

  add(NOTE('Админы мөр.',
    'Хүснэгтээс харахад Системийн админ зөвхөн SELECT баганад тэмдэгтэй байна. Бичих, устгах баганад «—» тэмдэг байгаа нь дутуу бичсэнийх биш — админ төслийн агуулгад хүрэхгүй гэсэн шаардлагын шууд илэрхийлэл юм. Энэ бодлого нь өгөгдлийн санд бичигдсэн тул интерфэйсийг тойрч API-руу шууд хандсан ч зөрчигдөхгүй.'));

  return c;
};
