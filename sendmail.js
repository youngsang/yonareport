var schedule = require('node-schedule');
var mysql      = require('mysql');
const nodemailer = require('nodemailer');
const smtpPool = require('nodemailer-smtp-pool');
// smtpPool는 smtp서버를 사용하기 위한 모듈로
// transporter객체를 만드는 nodemailer의 createTransport메소드의 인자로 사용된다.


var connection = mysql.createConnection({
  host     : 'yona.xxxxxxxxx.xxxxxx',  // yona database ip or domain
  user     : 'yona',
  password : 'xxxxxxxxxxxxxx',               // database password
  port     : 3306,
  database : 'yona'
});

const config = {
  mailer: {
    service: "gmail",
    host: 'smtp.google.com',
    port: 465,
    user: 'xxxxxxx@xxxxxxxxx.com',           // gmail username
    password: 'xxxxxxxxxxxxxxxxxx',                // gmail password
  },
};

var from = 'YONA reporter < xxxxxxx@xxxxxxxxx.com >';   // 임의 지정
var mailtitle = '[YONA 자동발송] [USERNAME] 님의 현재 이슈 리스트 입니다.';
var defaultmailtitle = '[YONA 자동발송] [USERNAME] 님의 현재 이슈 리스트 입니다.';
var userno = 0;
var mailname = "";
var html = "";
var infomain = new Array();
var row ;
var loopnum = 0;
var interval = 1000;

const transporter = nodemailer.createTransport(smtpPool({
  service: config.mailer.service,
  host: config.mailer.host,
  port: config.mailer.port,
  auth: {
    user: config.mailer.user,
    pass: config.mailer.password,
  },
  tls: {
    rejectUnauthorize: false,
  },
  maxConnections: 10,
  maxMessages: 10,
}));



function sendmail() {

  connection.connect(function(err) {
    if (err) throw err;
    // if connection is successful
    connection.query(`
    select 
      ordernum,type,label,number,title,DATE_FORMAT(created_date,'%Y/%m/%d') as created_date ,DATE_FORMAT(updated_date,'%Y/%m/%d') as updated_date,IFNULL(DATE_FORMAT(due_date,'%Y/%m/%d'),'') as due_date,author_id,author_name,siteurl,user_id,assignee_name,email,CAST(gnum AS UNSIGNED) as gnum,CAST(rnum-1 AS UNSIGNED) as rnum
    from (
      select 
        *, 
        (CASE @vjob WHEN tmain.user_id THEN @rownum:=@rownum+1 ELSE @rownum:=1 END) rnum,
        (CASE @vjob WHEN tmain.user_id THEN @groupnum:=@groupnum ELSE @groupnum:=@groupnum+1 END) gnum,
        (@vjob:=tmain.user_id) vjob
      from (
        select 
          ordernum,type,label,number,title,created_date,updated_date,due_date,author_id,author_name,siteurl,user_id,assignee_name,email
        from (
          select 
          0 as ordernum,
          '마감일없슴' as type,
          (select group_concat(concat(name,'|',color)) from issue_label where id in (select issue_label_id from issue_issue_label where issue_id=issue.id)) as label,
          number,
          issue.title,issue.created_date,issue.updated_date,issue.due_date,issue.author_id,issue.author_name,
          CONCAT((select concat('https://yona.xxxxxxxxx.xxxxxx/',owner,'/',name,'/issue/') from project where id=issue.project_id),number) as siteurl,
          assignee.user_id,
          n4user.name as assignee_name,
          n4user.email
          from 
          issue inner join assignee on issue.assignee_id=assignee.id
          inner join n4user on assignee.user_id=n4user.id
          where 
          n4user.state='ACTIVE' and issue.state=1 and issue.due_date is null and issue.assignee_id is not null
          
          union all
          
          select 
          1 as ordernum,
          '오늘마감' as type,
          (select group_concat(concat(name,'|',color)) from issue_label where id in (select issue_label_id from issue_issue_label where issue_id=issue.id)) as label,
          number,
          issue.title,issue.created_date,issue.updated_date,issue.due_date,issue.author_id,issue.author_name,
          CONCAT((select concat('https://yona.xxxxxxxxx.xxxxxx/',owner,'/',name,'/issue/') from project where id=issue.project_id),number) as siteurl,
          assignee.user_id,
          n4user.name as assignee_name,
          n4user.email
          from 
          issue inner join assignee on issue.assignee_id=assignee.id
          inner join n4user on assignee.user_id=n4user.id
          where 
          n4user.state='ACTIVE' and issue.state=1 and 
          date(issue.due_date) between date_format(now(),'%Y-%m-%d') and date_format(now(),'%Y-%m-%d')  and issue.assignee_id is not null
          
          union all
          
          select 
          2 as ordernum,
          '이번주 마감' as type,
          (select group_concat(concat(name,'|',color)) from issue_label where id in (select issue_label_id from issue_issue_label where issue_id=issue.id)) as label,
          number,
          issue.title,issue.created_date,issue.updated_date,issue.due_date,issue.author_id,issue.author_name,
          CONCAT((select concat('https://yona.xxxxxxxxx.xxxxxx/',owner,'/',name,'/issue/') from project where id=issue.project_id),number) as siteurl,
          assignee.user_id,
          n4user.name as assignee_name,
          n4user.email
          from 
          issue inner join assignee on issue.assignee_id=assignee.id
          inner join n4user on assignee.user_id=n4user.id
          where 
          n4user.state='ACTIVE' and issue.state=1 and 
          date_format(due_date,'%u') = date_format(now(),'%u') and date_format(due_date,'%d') <> date_format(now(),'%d') and issue.assignee_id is not null
          
          
          union all
          
          select 
          3 as ordernum,
          '이번달 마감' as type,
          (select group_concat(concat(name,'|',color)) from issue_label where id in (select issue_label_id from issue_issue_label where issue_id=issue.id)) as label,
          number,
          issue.title,issue.created_date,issue.updated_date,issue.due_date,issue.author_id,issue.author_name,
          CONCAT((select concat('https://yona.xxxxxxxxx.xxxxxx/',owner,'/',name,'/issue/') from project where id=issue.project_id),number) as siteurl,
          assignee.user_id,
          n4user.name as assignee_name,
          n4user.email
          from 
          issue inner join assignee on issue.assignee_id=assignee.id
          inner join n4user on assignee.user_id=n4user.id
          where 
          n4user.state='ACTIVE' and issue.state=1 and 
          date_format(issue.due_date,'%m') = date_format(now(),'%m') and date_format(issue.due_date,'%u') <> date_format(now(),'%u') and issue.assignee_id is not null
        ) as tb
        group by tb.number 
        order by tb.user_id asc , tb.ordernum asc , tb.number desc
      ) as tmain, (SELECT @vjob:='', @rownum:=0, @groupnum:=0 FROM DUAL) b
      ORDER BY tmain.user_id, tmain.ordernum asc, tmain.number desc    
    ) c`, function (err, result) {

      if (err) throw err;

      Object.keys(result).forEach(function(key) {
        row = result[key];
        loopnum = row.rnum ;
        if (row.rnum === 0){
          infomain[row.gnum] = new Array();
        }
        infomain[row.gnum][loopnum] = {ordernum : row.ordernum,type : row.type, label : row.label, number : row.number,title : row.title,created_date : row.created_date,updated_date : row.updated_date,due_date : row.due_date,author_id : row.author_id,author_name : row.author_name,siteurl : row.siteurl,user_id : row.user_id,assignee_name : row.assignee_name,email : row.email,gnum : row.gnum,rnum : row.rnum};
      });

      for(var val in infomain) {
        setTimeout( function (val) {
          userno    = infomain[val][0].user_id;
          from      = 'YONA reporter < admin@yona.xxxxxxxxx.xxxxxx >';
          to        = infomain[val][0].email;
          mailname  = infomain[val][0].assignee_name;
          subject   = defaultmailtitle.replace("[USERNAME]",infomain[val][0].assignee_name);
          html      = "<div style='position:absolute;font-size1em;border:darkgray 1px solid;min-width:300px;width:90%;margin:10px;padding:4px 4px 4px 4px;border-radius:2px;'>";

          for(var i in infomain[val]) {
            html  = html+"<div style='margin:5px 5px 0 5px;'><div style='float:left;'><a href='"+infomain[val][i].siteurl+"' target='_blank' style='text-decoration:none;color:black;'><b>#"+infomain[val][i].number+"</b>&nbsp;"+infomain[val][i].title+"</a></div><br><div style='float:left;font-size:0.8em;margin:0 0 0 2px;'>";

            if (infomain[val][i].label){

              var templabel = infomain[val][i].label;
              templabel = templabel.split(",");

              for (var j in templabel){
                html  = html+"&nbsp;<div style='padding:2px 5px 2px 5px;color:#ffffff;text-shadow:1px 1px 2px #000000;background-color:"+templabel[j].split("|")[1]+";border-radius:2px;display:inline-block;'>"+templabel[j].split("|")[0]+"</div>";
              }
            } else {
              html  = html+"<div style='padding:2px 5px 2px 5px;border-radius:2px;display:inline-block;'></div>";
            }
            
            html  = html+"</div><div style='font-size:0.8em;'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"+infomain[val][i].author_name+" / create : "+infomain[val][i].created_date+" / update : "+infomain[val][i].updated_date+" / due : "+infomain[val][i].due_date+"</div> </div>";
          }

          html = html + "</div>"

          var mailOptions = {from,to,subject,html};

          transporter.sendMail(mailOptions, (err, res) => {
            if (err) { console.log(to+':'+defaultmailtitle.replace("[USERNAME]",infomain[val][0].assignee_name)+' -> failed... => ', err); } else { console.log(to+':'+defaultmailtitle.replace("[USERNAME]",infomain[val][0].assignee_name)+' -> succeed... => ', res);}
            //transporter.close();
            next();
          });
        }, interval * val, val);
      }
    });
  });

};


var rule = new schedule.RecurrenceRule();
rule.dayOfWeek = [0, new schedule.Range(4,6)];
rule.hour = 9;
rule.minute = 0;

var j = schedule.scheduleJob(rule, function(){
    sendmail();
});
