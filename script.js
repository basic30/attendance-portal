const firebaseConfig = {
    // Replace with your own Firebase config
    apiKey: "AIzaSyBimjSAEhXgUr8XiJcdU5qMAmqBoZD7zBc",
    authDomain: "attendanceportal-c745d.firebaseapp.com",
    databaseURL: "https://attendanceportal-c745d-default-rtdb.firebaseio.com",
    projectId: "attendanceportal-c745d",
    storageBucket: "attendanceportal-c745d.firebasestorage.appspot.com",
    messagingSenderId: "18278101782",
    appId: "1:18278101782:web:f1877ef2ddef8268c89637"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();

const adminEmail = 'snahasishdey143@gmail.com'; // Replace with your admin email

let currentUser;
let isAdmin = false;
let classes = {};
let attended = {};
let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth();

auth.onAuthStateChanged(user => {
    if (user) {
        currentUser = user;
        isAdmin = user.email === adminEmail;
        document.getElementById('login').hidden = true;
        document.getElementById('dashboard').hidden = false;
        document.getElementById('user-name').textContent = user.displayName;
        setPeriod(currentYear, currentMonth);
        db.ref('classes').on('value', snap => {
            classes = snap.val() || {};
            updateCalendar();
            updatePercentage();
        });
        if (!isAdmin) {
            db.ref('attendance/' + user.uid).on('value', snap => {
                attended = snap.val() || {};
                updateCalendar();
                updatePercentage();
            });
            document.getElementById('percentage').style.display = 'block';
        } else {
            document.getElementById('percentage').style.display = 'none';
        }
        updateCalendar();
    } else {
        document.getElementById('login').hidden = false;
        document.getElementById('dashboard').hidden = true;
    }
});

document.getElementById('google-login').onclick = () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider);
};

document.getElementById('logout').onclick = () => {
    auth.signOut();
};

document.getElementById('prev-month').onclick = () => {
    currentMonth--;
    if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
    }
    setPeriod(currentYear, currentMonth);
    updateCalendar();
};

document.getElementById('next-month').onclick = () => {
    currentMonth++;
    if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
    }
    setPeriod(currentYear, currentMonth);
    updateCalendar();
};

document.getElementById('from-date').onchange = updatePercentage;
document.getElementById('to-date').onchange = updatePercentage;

function setPeriod(year, month) {
    const fromDate = new Date(year, month, 1).toISOString().slice(0, 10);
    const toDate = new Date(year, month + 1, 0).toISOString().slice(0, 10);
    document.getElementById('from-date').value = fromDate;
    document.getElementById('to-date').value = toDate;
}

function generateCalendar(year, month) {
    document.getElementById('month-year').textContent = new Date(year, month).toLocaleString('default', { month: 'long' }) + ' ' + year;
    const body = document.getElementById('calendar-body');
    body.innerHTML = '';
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let row = document.createElement('tr');
    let cellCount = 0;
    for (let i = 0; i < firstDay; i++) {
        row.appendChild(document.createElement('td'));
        cellCount++;
    }
    for (let day = 1; day <= daysInMonth; day++) {
        const td = document.createElement('td');
        td.id = 'day-' + day;
        td.onclick = () => handleClick(day);
        row.appendChild(td);
        cellCount++;
        if (cellCount % 7 === 0 || day === daysInMonth) {
            body.appendChild(row);
            row = document.createElement('tr');
            cellCount = 0;
        }
    }
}
function updateCalendar() {
    generateCalendar(currentYear, currentMonth);
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = new Date(currentYear, currentMonth, day).toISOString().slice(0, 10);
        const numClasses = classes[dateStr] || 0;
        let display = '';
        let colorClass = '';
        if (numClasses > 0) {
            if (isAdmin) {
                display = numClasses;
                colorClass = 'blue';
            } else {
                const numAtt = attended[dateStr] || 0;
                display = numAtt + '/' + numClasses;
                if (numAtt === numClasses) {
                    colorClass = 'green';
                } else if (numAtt > 0) {
                    colorClass = 'yellow';
                } else {
                    colorClass = 'red';
                }
            }
        }
        const td = document.getElementById('day-' + day);
        td.innerHTML = `
            <div class="day-number">${day}</div>
            ${display ? `<span class="attendance ${colorClass}">${display}</span>` : ''}
        `;
    }
}

function handleClick(day) {
    const dateStr = new Date(currentYear, currentMonth, day).toISOString().slice(0, 10);
    if (isAdmin) {
        const num = prompt(`Enter number of classes for ${dateStr}`, classes[dateStr] || 0);
        if (num !== null) {
            const n = parseInt(num);
            if (!isNaN(n) && n >= 0) {
                db.ref('classes/' + dateStr).set(n);
            }
        }
    } else {
        const numClasses = classes[dateStr] || 0;
        if (numClasses > 0) {
            const num = prompt(`Enter number of classes attended (0 to ${numClasses})`, attended[dateStr] || 0);
            if (num !== null) {
                const n = parseInt(num);
                if (!isNaN(n) && n >= 0 && n <= numClasses) {
                    db.ref('attendance/' + currentUser.uid + '/' + dateStr).set(n);
                }
            }
        } else {
            alert('No classes scheduled for this date.');
        }
    }
}

function updatePercentage() {
    if (isAdmin) return;
    const from = document.getElementById('from-date').value;
    const to = document.getElementById('to-date').value;
    if (!from || !to) return;
    const startDate = new Date(from);
    const endDate = new Date(to);
    let totalClasses = 0;
    let totalAttended = 0;
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().slice(0, 10);
        const nc = classes[dateStr] || 0;
        totalClasses += nc;
        totalAttended += attended[dateStr] || 0;
    }
    const percentage = totalClasses > 0 ? (totalAttended / totalClasses * 100).toFixed(2) : 0;
    document.getElementById('percentage').innerHTML = 
        <div class="pie">
            ${totalAttended}/${totalClasses}
        </div>
    ;
}