const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const { pathToFileURL } = require('node:url');
const { once } = require('node:events');
const { chromium } = require('playwright');
const { existsSync, mkdtempSync } = require('node:fs');
const { resolve, join } = require('node:path');
const { tmpdir } = require('node:os');
const beRoot = resolve(__dirname, '../../GoMate-BE'), beRequire = createRequire(beRoot + '/package.json');
const be = name => import(pathToFileURL(beRoot + '/src/' + name + '.js').href);

(async () => {
  const { MongoMemoryServer } = beRequire('mongodb-memory-server');
  const [{ createApp }, { readConfig }, { createClient, initializeDatabase }, { createAuthRepository }, { createActivityRepository }, { createChatRepository }, { hashPassword }] = await Promise.all(['app', 'config/env', 'database/mongo', 'modules/auth/repository', 'modules/activities/repository', 'modules/chat/repository', 'modules/auth/password'].map(be));
  const artifacts = mkdtempSync(join(tmpdir(), 'gomate-business-workflow-')); console.log('Business artifacts:', artifacts);
  const mongo = await MongoMemoryServer.create(), client = createClient(readConfig({ MONGODB_URI: mongo.getUri('business_workflow_ui') }));
  await client.connect(); const db = client.db(); await initializeDatabase(db);
  const auth = createAuthRepository(db), activities = createActivityRepository(db), chat = createChatRepository(db), users = [];
  const passwordHash = await hashPassword('123456');
  for (const [index, name] of ['Web Business Owner', 'Web Admin', 'Web Employee', 'Web Participant'].entries()) {
    const user = await auth.createUser({ name, email: `business-web${index}@example.com`, passwordHash }); users.push(user);
    await db.collection('users').updateOne({ id: user.id }, { $set: { role: index === 1 ? 'admin' : 'user', email_verified: true, username: 'businessweb'+index, birthDate: '2000-01-01', gender: 'other', location: 'TP. Hồ Chí Minh', bio: 'Business web journey', interests: ['Workshop'], languages: ['Tiếng Việt'] } });
  }
  const server = createApp(readConfig({}), { authRepository: auth, activityRepository: activities, chatRepository: chat }).listen(0, '127.0.0.1'); await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`, errors = [], pages = [];
  let browser;
  try {
    browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || (existsSync('C:/Program Files/Google/Chrome/Application/chrome.exe') ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' : undefined), headless: true });
    for (let index=0;index<4;index++) { const page=await browser.newPage({timezoneId:"Asia/Ho_Chi_Minh",viewport:{width:index===3?390:1440,height:1000}});page.setDefaultTimeout(20000);page.on('pageerror',error=>errors.push(error.message));pages.push(page); }
    const [owner, admin, employee, participant] = pages;
    const visible = (page,text) => page.getByText(text,{exact:true}).first().waitFor({state:'visible'});
    const click = (page,text) => page.getByText(text,{exact:true}).last().click();
    const nav = (page,text) => page.locator('.gm-sidebar-nav').getByRole('button',{name:text,exact:true}).click();
    const call = (page,path,method='GET',body) => page.evaluate(async ({path,method,body})=>{ const session=JSON.parse(localStorage.getItem('gomate.session'));const response=await fetch('/api'+path,{method,headers:{Authorization:'Bearer '+session.accessToken,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});return {status:response.status,body:await response.json()}; },{path,method,body});
    const login = async (page,index) => { await page.goto(base+'/portal');await page.getByLabel('Email',{exact:true}).fill(users[index].email);await page.getByLabel('Mật khẩu',{exact:true}).fill('123456');await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();await page.locator('.gm-sidebar').waitFor(); };
    await login(owner,0); await login(admin,1); await login(employee,2); await login(participant,3);
    const company = 'Web Workshop Company';
    for(const [label,value] of [['Tên doanh nghiệp',company],['Mã số thuế','0312345678'],['Lĩnh vực hoạt động','Workshop'],['Địa chỉ chi tiết','12 Nguyễn Huệ, TP. Hồ Chí Minh'],['Họ và tên người đại diện','Nguyễn Văn An'],['Chức vụ','Giám đốc'],['Email liên hệ','an@example.com'],['Số điện thoại','0901234567']]) await owner.getByLabel(label,{exact:true}).fill(value);
    await owner.getByLabel('Hồ sơ xác minh',{exact:true}).setInputFiles({name:'license.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4\nPrivate web license')});
    await click(owner,'Gửi hồ sơ xác minh'); await visible(owner,'Chờ duyệt'); await owner.reload();await owner.locator('.gm-verification-summary dd').filter({hasText:'Nguyễn Văn An'}).waitFor();await visible(owner,'0312345678');
    await admin.reload(); const applicationCard=admin.locator('.gm-live-review').filter({has:admin.getByRole('heading',{name:company,exact:true})});
    await admin.getByLabel('Ghi chú hồ sơ '+company,{exact:true}).fill('Bổ sung địa chỉ');await applicationCard.getByRole('button',{name:'Từ chối hồ sơ',exact:true}).click();await visible(admin,'Đã gửi lý do từ chối.');
    await owner.reload();await owner.getByLabel('Địa chỉ chi tiết',{exact:true}).fill('20 Nguyễn Huệ, TP. Hồ Chí Minh');await click(owner,'Gửi lại hồ sơ');await visible(owner,'Chờ duyệt');
    await admin.reload();await applicationCard.getByRole('button',{name:'Duyệt doanh nghiệp',exact:true}).click();await visible(admin,'Đã duyệt thành công.');
    await owner.reload();await visible(owner,'Doanh nghiệp đã xác minh');assert.equal((await db.collection('business_applications').findOne({ownerId:users[0].id})).address,'20 Nguyễn Huệ, TP. Hồ Chí Minh');
    console.log('PASS complete profile survives reload, rejection/resubmission retains private license and approval grants business access');

    await nav(owner,'Thư viện địa điểm');const locationForm=owner.locator('.gm-location-editor form');
    await locationForm.getByLabel('Tên địa điểm',{exact:true}).fill('Workshop branch');await locationForm.getByLabel('Địa chỉ chi tiết',{exact:true}).fill('20 Nguyễn Huệ');await locationForm.getByLabel('Vĩ độ',{exact:true}).fill('10.77');await locationForm.getByLabel('Kinh độ',{exact:true}).fill('106.69');await locationForm.getByRole('button',{name:'Thêm địa điểm',exact:true}).click();await owner.locator('.gm-location-row').filter({hasText:'Workshop branch'}).waitFor();
    await owner.reload();await nav(owner,'Thư viện địa điểm');await owner.locator('.gm-location-row').filter({hasText:'Workshop branch'}).waitFor();
    await nav(owner,'Tạo bài đăng');await owner.getByLabel('Tiêu đề bài đăng',{exact:true}).fill('Web real campaign');await owner.getByLabel('Giới thiệu bài đăng',{exact:true}).fill('A real workshop with two independent groups');await owner.getByLabel('Ưu đãi',{exact:true}).fill('Welcome drink');
    const groupForms=owner.locator('.gm-generated-group');for(let index=0;index<2;index++){const form=groupForms.nth(index);await form.getByLabel('Tên nhóm',{exact:true}).fill('Web group '+index);await form.getByLabel(/^Chọn nhanh địa điểm/).selectOption({label:'Workshop branch · Ho Chi Minh City'});await form.getByLabel('Tiền cọc / người (VND)',{exact:true}).fill(index===0?'50000':'0');}
    await owner.locator('.gm-multi-post-footer button[type="submit"]').click();await visible(owner,'Đã gửi bài và 2 nhóm để duyệt. Các nhóm chỉ xuất hiện trên app sau khi Staff duyệt.');
    assert.equal(await db.collection('activities').countDocuments({hostId:users[0].id}),0);
    await admin.reload();const postCard=admin.locator('.gm-live-review').filter({has:admin.getByRole('heading',{name:'Web real campaign',exact:true})});await postCard.getByRole('button',{name:'Duyệt và đưa lên app',exact:true}).click();await visible(admin,'Đã duyệt thành công.');
    await owner.reload();await nav(owner,'Nhóm đang hoạt động');await visible(owner,'Quản lý nhóm thực tế');assert.equal(await db.collection('activities').countDocuments({hostId:users[0].id,status:'published'}),2);
    const activity=await db.collection('activities').findOne({hostId:users[0].id,businessGroupName:'Web group 0'});
    assert.deepEqual(activity.coordinates,{type:'Point',coordinates:[106.69,10.77]});
    console.log('PASS location persistence and staff-approved multi-group campaign creates real discoverable activity records');

    await nav(owner,'Nhân sự doanh nghiệp');const staffForm=owner.locator('.gm-staff-form-panel form');const textInputs=staffForm.locator('input:not([type="checkbox"])');for(const [index,value] of ['Web Coordinator',users[2].email,'0901234567','Group host'].entries()) await textInputs.nth(index).fill(value);await staffForm.locator('.gm-staff-group-option').filter({hasText:'Web group 0'}).locator('input').check();await staffForm.locator('button[type="submit"]').click();await owner.locator('.gm-staff-row').filter({hasText:'Web Coordinator'}).waitFor();
    await employee.reload();await click(employee,'Đồng ý làm nhân sự');await employee.getByRole('button',{name:'Đồng ý làm nhân sự',exact:true}).waitFor({state:'hidden'});
    await admin.reload();await nav(admin,'Hồ sơ doanh nghiệp');await admin.locator('.gm-admin-review-tabs button').nth(1).click();const staffRow=admin.locator('.gm-admin-staff-table tbody tr').filter({hasText:'Web Coordinator'});await staffRow.getByRole('button',{name:/^(Duyệt|Approve)$/}).click();await staffRow.waitFor({state:'hidden'});await admin.locator('.gm-admin-filter select').selectOption('approved');await staffRow.getByText(/^(Đã duyệt|Approved)$/).waitFor();
    await employee.reload();await visible(employee,'Quản lý nhóm thực tế');assert.equal(await employee.locator('.gm-active-group-select option').count(),1);assert.equal((await call(employee,'/portal/groups')).body.total,1);
    await employee.goto(base+'/#/app/home/myActivities');
    await visible(employee,'Nhân sự quản lý · Được phân công');
    assert.equal((await call(employee,'/me/join-requests')).body.total,0);
    assert.ok((await call(employee,'/conversations')).body.items.some(row=>row.activityId===activity.id));
    await click(employee,activity.title); await visible(employee,'Bạn là nhân sự quản lý nhóm doanh nghiệp');
    await employee.getByRole('tab',{name:'Thành viên',exact:true}).click();
    await visible(employee,users[0].name);
    assert.equal(await employee.getByText('Rời nhóm',{exact:true}).count(),0);
    await employee.getByRole('tab',{name:'Chat',exact:true}).click();
    await employee.getByLabel('Tin nhắn',{exact:true}).fill('Staff joined the assigned group');
    await employee.getByRole('button',{name:'Gửi tin nhắn',exact:true}).click();
    await visible(employee,'Staff joined the assigned group');
    await employee.screenshot({path:join(artifacts,'assigned-staff-app-group.png'),fullPage:true});
    await employee.goto(base+'/portal'); await visible(employee,'Quản lý nhóm thực tế');
    await participant.goto(base+'/#/app/home/activityDetail/'+activity.id);await visible(participant,'Tiền cọc / người: 50.000 VND · Liên hệ doanh nghiệp để được hướng dẫn.');await click(participant,'Gửi yêu cầu tham gia');await participant.getByRole('checkbox',{name:'Tôi đồng ý với cam kết tham gia',exact:true}).click();await click(participant,'Xác nhận và gửi yêu cầu');await visible(participant,'Đang chờ host duyệt');
    await employee.reload();await click(employee,'Duyệt tham gia');await employee.getByRole('button',{name:'Duyệt tham gia',exact:true}).waitFor({state:'hidden'});assert.equal(await employee.getByRole('button',{name:'Bắt đầu hoạt động',exact:true}).isDisabled(),true);
    await click(employee,'Đánh dấu đã trả');await employee.getByRole('button',{name:'Đánh dấu đã trả',exact:true}).waitFor({state:'hidden'});
    await employee.getByRole('tab',{name:'Lịch trình',exact:true}).click();await click(employee,'Thêm mốc lịch trình');await employee.locator('.gm-itinerary-fields select').selectOption((await db.collection('business_locations').findOne({ownerId:users[0].id})).id);await employee.getByLabel('Thời gian',{exact:true}).fill('09:30');await employee.getByLabel('Tên mốc lịch trình',{exact:true}).fill('Welcome workshop');await click(employee,'Thêm vào lịch trình');await visible(employee,'Welcome workshop');
    await employee.getByRole('tab').last().click();await employee.getByLabel('Tiêu đề ưu đãi',{exact:true}).fill('Participant drink');await employee.getByLabel('Nội dung',{exact:true}).fill('Welcome drink for your group');await click(employee,'Gửi ưu đãi');await visible(employee,'Participant drink');await click(employee,'Sửa ưu đãi');await employee.getByLabel('Tiêu đề ưu đãi',{exact:true}).fill('Updated participant drink');await click(employee,'Lưu thông báo ưu đãi');await visible(employee,'Updated participant drink');
    await employee.reload();await visible(employee,'Quản lý nhóm thực tế');assert.equal((await activities.get(activity.id)).itinerary[0].title,'Welcome workshop');assert.equal(await db.collection('notifications').countDocuments({userId:users[3].id,title:'Updated participant drink'}),1);
    await participant.goto(base+'/#/app/home/group/'+activity.id);await participant.getByRole('tab',{name:'Kế hoạch',exact:true}).click();await visible(participant,'Welcome workshop');
    await click(employee,'Chốt lịch');await employee.getByRole('button',{name:'Bắt đầu hoạt động',exact:true}).waitFor();await click(employee,'Bắt đầu hoạt động');await visible(employee,'Điểm danh');
    for(const name of [company,users[3].name]){const select=employee.getByLabel('Điểm danh '+name,{exact:true});await select.selectOption('present');await select.waitFor();}
    await employee.getByRole('button',{name:'Kết thúc hoạt động',exact:true}).click();await visible(employee,'Nhóm đã đóng. Người được điểm danh có mặt/đến muộn có thể đánh giá trong app GoMate.');
    await participant.goto(base+'/#/app/home/summary/'+activity.id);await visible(participant,'Tổng kết hoạt động');await click(participant,'Đánh giá trải nghiệm');await participant.getByLabel('Trải nghiệm: 5 sao',{exact:true}).click();await click(participant,'Gửi đánh giá');await visible(participant,'Cảm ơn bạn đã chia sẻ!');
    assert.equal(await db.collection('rating_submissions').countDocuments({activityId:activity.id,userId:users[3].id}),1);
    console.log('PASS real employee consent/admin approval, scoped membership/deposit/plan/offer operations, attendance/completion and participant rating');
    await owner.reload();await nav(owner,'Nhân sự doanh nghiệp');await owner.locator('.gm-staff-row').filter({hasText:'Web Coordinator'}).locator('.gm-staff-actions button').last().click();await visible(owner,'Đã thu hồi');await employee.reload();assert.equal((await call(employee,'/portal/groups')).status,403);
    await owner.screenshot({path:join(artifacts,'staff-revoked.png'),fullPage:true});await admin.screenshot({path:join(artifacts,'admin-real-staff.png'),fullPage:true});
    await click(owner, 'Ví & đối soát');
    await owner.getByRole('heading', {name:'Ví doanh nghiệp · Đối soát cọc',exact:true}).waitFor();
    await owner.getByText('Doanh nghiệp dự kiến nhận sau phí', {exact:true}).waitFor();
    assert.equal(await owner.locator('dl dd').first().innerText(), new Intl.NumberFormat('vi-VN',{style:'currency',currency:'VND'}).format(0));
    await owner.screenshot({path:join(artifacts,'business-wallet.png'),fullPage:true});
    // Hold one endpoint beyond the real API timeout.
    // A slow refresh must not spawn another batch or overwrite existing data.
    await owner.bringToFront();
    await owner.reload(); await nav(owner, 'Ví & đối soát');
    await owner.locator('dl dd').first().waitFor();
    let releaseStaff, staffStarted, staffCalls = 0;
    const heldStaff = new Promise(resolve => { releaseStaff = resolve; });
    const startedStaff = new Promise(resolve => { staffStarted = resolve; });
    await owner.route('**/api/portal/staff?*', async route => {
      staffCalls++; staffStarted(); await heldStaff;
      await route.abort().catch(() => {});
    });
    await Promise.race([startedStaff, new Promise((_, reject) => setTimeout(() => reject(Error('Background staff request did not start')), 30000))]);
    await new Promise(resolve => setTimeout(resolve, 14000)); assert.equal(staffCalls, 1);
    const staleNotice = owner.getByRole('status').filter({hasText:'Chưa cập nhật được dữ liệu mới.'});
    await staleNotice.waitFor(); assert.equal(staffCalls, 1);
    assert.equal(await owner.locator('.gm-form-error').count(), 0);
    assert.equal(await owner.locator('dl dd').first().innerText(), new Intl.NumberFormat('vi-VN',{style:'currency',currency:'VND'}).format(0));
    releaseStaff(); await owner.unroute('**/api/portal/staff?*');
    await staleNotice.waitFor({state:'hidden',timeout:45000});
    console.log('PASS slow background refresh does not overlap; cached data survives timeout and recovery clears stale notice');
    assert.deepEqual(errors,[]);console.log('PASS immediate revocation and no browser runtime errors');
  } catch(error) { for(let index=0;index<pages.length;index++){console.log('PAGE '+index,pages[index].url(),(await pages[index].locator('body').innerText()).slice(0,3000));await pages[index].screenshot({path:join(artifacts,'failure-'+index+'.png'),fullPage:true}).catch(()=>{});}throw error; }
  finally {await browser?.close();await new Promise(resolve=>server.close(resolve));await client.close();await mongo.stop();}
})().catch(error=>{console.error(error);process.exitCode=1;});
