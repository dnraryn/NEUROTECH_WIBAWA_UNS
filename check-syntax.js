const fs = require('fs');
const parser = require('@babel/parser');
const files = ['router.jsx','primitives.jsx','mock-data.jsx','worker-screens.jsx','worker-profile.jsx','supervisor-screen.jsx','supervisor-workers.jsx','supervisor-alerts.jsx','supervisor-schedule.jsx','supervisor-reports.jsx','management-screen.jsx','landing.jsx','auth-login.jsx','app.jsx'];
for (const f of files) {
  try {
    parser.parse(fs.readFileSync(f,'utf8'), { sourceType: 'script', plugins: ['jsx'] });
    console.log('OK  ', f);
  } catch (e) {
    console.log('ERR ', f, '->', e.message.split('\n')[0]);
  }
}
