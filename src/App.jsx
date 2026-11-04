import React,{useEffect,useMemo,useState} from 'react';

const STORAGE='acl-roomgrid-18rooms-v1';
const rooms=['A1-203', 'A2-106', 'A2-107', 'A3-208', 'A3-209', 'B1-205', 'B1-206', 'B1-207', 'B2-104', 'B2-105', 'B3-301', 'C1-102', 'C1-103', 'C2-201', 'C2-202', 'C3-101', 'C3-102', 'D1-101'];
// End dates are exclusive; all sample reservations use non-overlapping date ranges.
const sampleRows=[
 ['A1-203','2026-11-09','2026-11-11','Peer tutoring','other'],
 ['A1-203','2026-11-13','2026-11-15','Architecture workshop','other'],
 ['A1-203','2026-11-17','2026-11-19','Group assignment','you'],
 ['A2-106','2026-11-10','2026-11-13','Seminar preparation','other'],
 ['A2-106','2026-11-16','2026-11-19','Study circle','other'],
 ['A2-107','2026-11-09','2026-11-10','Student club planning','you'],
 ['A2-107','2026-11-12','2026-11-15','Project demo rehearsal','other'],
 ['A2-107','2026-11-16','2026-11-19','Study meeting','other'],
 ['A3-208','2026-11-11','2026-11-14','Presentation practice','other'],
 ['A3-208','2026-11-16','2026-11-18','Tutorial group','other'],
 ['A3-209','2026-11-10','2026-11-12','Study session','other'],
 ['B1-205','2026-11-09','2026-11-11','Meeting','other'],
 ['B1-205','2026-11-13','2026-11-15','Team discussion','other'],
 ['B1-205','2026-11-16','2026-11-18','Course project','other'],
 ['B1-206','2026-11-11','2026-11-13','Exam revision','other'],
 ['B1-206','2026-11-17','2026-11-20','Debate practice','you'],
 ['B1-207','2026-11-10','2026-11-12','Group study','you'],
 ['B1-207','2026-11-16','2026-11-19','Engineering project','other'],
 ['B2-104','2026-11-09','2026-11-11','Weekly study group','you'],
 ['B2-104','2026-11-13','2026-11-15','Team planning','other'],
 ['B2-104','2026-11-17','2026-11-19','Workshop preparation','other'],
 ['B2-105','2026-11-12','2026-11-15','Club meeting','other'],
 ['B2-105','2026-11-16','2026-11-18','Student committee','other'],
 ['B3-301','2026-11-09','2026-11-10','Debate practice','other'],
 ['B3-301','2026-11-11','2026-11-13','Group preparation','other'],
 ['B3-301','2026-11-18','2026-11-20','Portfolio review','other'],
 ['C1-102','2026-11-10','2026-11-14','Capstone meeting','other'],
 ['C1-102','2026-11-16','2026-11-19','Revision session','other'],
 ['C1-103','2026-11-09','2026-11-12','Group project','other'],
 ['C1-103','2026-11-14','2026-11-16','Student society','you'],
 ['C2-201','2026-11-12','2026-11-15','Project sprint','other'],
 ['C2-201','2026-11-16','2026-11-19','Robotics club','other'],
 ['C2-202','2026-11-09','2026-11-11','Lab preparation','other'],
 ['C2-202','2026-11-18','2026-11-20','Teaching assistant session','other'],
 ['C3-101','2026-11-12','2026-11-14','Presentation rehearsal','you'],
 ['C3-101','2026-11-14','2026-11-16','Design workshop','other'],
 ['C3-101','2026-11-18','2026-11-20','Study group','other'],
 ['C3-102','2026-11-11','2026-11-15','Research meeting','other'],
 ['D1-101','2026-11-10','2026-11-13','Team check-in','other'],
 ['D1-101','2026-11-16','2026-11-18','Group assignment','you'],
];
const seed=sampleRows.map(([roomNumber,startDate,endDate,purpose,owner],index)=>({id:`demo-${index+1}`,roomNumber,startDate,endDate,purpose,owner}));
const formEmpty={roomNumber:'',startDate:'',endDate:'',purpose:''};
const FIELD_IDS={roomNumber:'f-room',startDate:'f-start',endDate:'f-end',dates:'f-start'};

function read(){try{let a=JSON.parse(localStorage.getItem(STORAGE));return Array.isArray(a)?a:seed;}catch{return seed;}}
function addDays(iso,days){const t=new Date(`${iso}T12:00:00Z`);t.setUTCDate(t.getUTCDate()+days);return t.toISOString().slice(0,10);}
function human(iso){return new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB',{timeZone:'UTC',day:'numeric',month:'short'});}
function weekDay(iso){return new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB',{timeZone:'UTC',weekday:'short'});}
function mondayOf(iso){const d=(new Date(`${iso}T12:00:00Z`).getUTCDay()+6)%7;return addDays(iso,-d);}
// Human-readable range for an exclusive end date, e.g. "17 Nov – 18 Nov · 2 days".
function rangeLabel(start,end){
 const last=addDays(end,-1);
 const n=Math.round((new Date(`${end}T12:00:00Z`)-new Date(`${start}T12:00:00Z`))/864e5);
 return `${human(start)}${last!==start?` – ${human(last)}`:''} · ${n} day${n===1?'':'s'}`;
}

// Same rules as before, but each failure says which field is wrong and why.
function issue(form,bookings,id){
 if(!form.roomNumber.trim())return {field:'roomNumber',message:'Choose a room: type its number or click a day in the calendar.'};
 if(!form.startDate)return {field:'startDate',message:'Enter a start date.'};
 if(!form.endDate)return {field:'endDate',message:'Enter an end (check-out) date.'};
 if(form.endDate<=form.startDate)return {field:'endDate',message:`End date must be after the start date (${human(form.startDate)}). For a one-day booking, use ${human(addDays(form.startDate,1))}.`};
 const clash=bookings.find(b=>b.id!==id&&b.roomNumber.toLowerCase()===form.roomNumber.trim().toLowerCase()&&form.startDate<b.endDate&&form.endDate>b.startDate);
 if(clash)return {field:'dates',message:`${clash.roomNumber} is already booked ${rangeLabel(clash.startDate,clash.endDate)}${clash.owner==='you'?' (one of your bookings)':''}. Choose dates that don't overlap.`};
 return null;
}

export default function App(){
 const [bookings,setBookings]=useState(read);
 const [week,setWeek]=useState('2026-11-09');
 const [view,setView]=useState('All rooms');
 const [form,setForm]=useState({...formEmpty});
 const [editing,setEditing]=useState(null);
 const [error,setError]=useState(null);
 const [notice,setNotice]=useState('');
 const [gridNote,setGridNote]=useState('');
 const [anchor,setAnchor]=useState(null); // first click of a range: {room,date}
 const [tab,setTab]=useState('Availability');
 useEffect(()=>localStorage.setItem(STORAGE,JSON.stringify(bookings)),[bookings]);
 const days=useMemo(()=>Array.from({length:7},(_,i)=>addDays(week,i)),[week]);
 const myBookings=bookings.filter(b=>b.owner==='you').sort((a,b)=>a.startDate.localeCompare(b.startDate));
 const roomList=view==='All rooms'?rooms:rooms.filter(r=>r===view);
 const occupied=(room,date)=>bookings.find(b=>b.roomNumber===room&&date>=b.startDate&&date<b.endDate);
 const formRoom=form.roomNumber.trim().toLowerCase();
 const inSelection=(room,date)=>!!form.startDate&&!!form.endDate&&room.toLowerCase()===formRoom&&date>=form.startDate&&date<form.endDate;
 const invalid=name=>!!error&&(error.field===name||(error.field==='dates'&&(name==='startDate'||name==='endDate')));
 const fieldProps=name=>({id:FIELD_IDS[name],'aria-invalid':invalid(name)||undefined,'aria-describedby':invalid(name)?'form-error':undefined});
 const rangeOk=form.startDate&&form.endDate&&form.endDate>form.startDate;

 function scrollToForm(){document.getElementById('booking-form')?.scrollIntoView({behavior:'smooth',block:'nearest'});}

 function setField(name,value){
  setForm(f=>({...f,[name]:value}));
  setAnchor(null);
  if(invalid(name))setError(null);
 }

 // Fill the form from the grid; keep edit mode if the user is re-picking dates for the booking being edited.
 function selectRange(room,start,end){
  const editedRoom=editing&&bookings.find(b=>b.id===editing)?.roomNumber;
  const keepEdit=editedRoom===room;
  const next={roomNumber:room,startDate:start,endDate:end,purpose:form.roomNumber===room?form.purpose:''};
  setForm(next);
  if(!keepEdit)setEditing(null);
  setNotice('');
  const err=issue(next,bookings,keepEdit?editing:null);
  setError(err&&err.field==='dates'?err:null);
 }

 function clickCell(room,day){
  const b=occupied(room,day);
  if(b&&b.id!==editing){
   setAnchor(null);
   if(b.owner==='you'){edit(b);return;}
   setGridNote(`${room} is reserved by another student ${rangeLabel(b.startDate,b.endDate)}. Pick an open day instead.`);
   return;
  }
  if(anchor&&anchor.room===room&&day>=anchor.date){
   const end=addDays(day,1);
   selectRange(room,anchor.date,end);
   setAnchor(null);
   setGridNote(`Selected ${room}, ${rangeLabel(anchor.date,end)}. Review the form and confirm.`);
  }else{
   selectRange(room,day,addDays(day,1));
   setAnchor({room,date:day});
   setGridNote(`Start set: ${room}, ${weekDay(day)} ${human(day)}. Click a later day in the same row to extend, or confirm a one-day booking.`);
  }
 }

 function edit(row){
  if(row.owner!=='you')return;
  setEditing(row.id);
  setForm({roomNumber:row.roomNumber,startDate:row.startDate,endDate:row.endDate,purpose:row.purpose});
  setError(null);setNotice('');setAnchor(null);
  setWeek(mondayOf(row.startDate));
  if(view!=='All rooms'&&view!==row.roomNumber)setView('All rooms');
  setGridNote(`Changing your booking: ${row.roomNumber}, ${rangeLabel(row.startDate,row.endDate)}. Click days in this row to pick new dates, or edit the form.`);
  scrollToForm();
 }

 function cancelEdit(){setEditing(null);setForm({...formEmpty});setError(null);setAnchor(null);setGridNote('');}

 function submit(e){
  e.preventDefault();setNotice('');
  const err=issue(form,bookings,editing);
  if(err){setError(err);document.getElementById(FIELD_IDS[err.field])?.focus();return;}
  const payload={roomNumber:form.roomNumber.trim(),startDate:form.startDate,endDate:form.endDate,purpose:form.purpose.trim(),owner:'you'};
  const summary=`${payload.roomNumber}, ${rangeLabel(payload.startDate,payload.endDate)}`;
  if(editing){setBookings(bookings.map(b=>b.id===editing?{...b,...payload}:b));setNotice(`Booking updated: ${summary}.`);}
  else{setBookings([...bookings,{...payload,id:'b-'+Date.now()}]);setNotice(`Room reserved: ${summary}.`);}
  setForm({...formEmpty});setEditing(null);setError(null);setAnchor(null);setGridNote('');
 }

 function reset(){
  if(!window.confirm('Reset the demo? Your changes will be removed and the example bookings restored.'))return;
  setBookings(seed);setForm({...formEmpty});setEditing(null);setWeek('2026-11-09');setNotice('Example bookings restored.');setError(null);setView('All rooms');setAnchor(null);setGridNote('');
 }

 function check(){
  setNotice('');setError(null);
  const err=issue(form,bookings,editing);
  if(err)setError(err);
  else setNotice(`${form.roomNumber.trim()} is free for ${rangeLabel(form.startDate,form.endDate)}.`);
 }

 function goTo(name,id){setTab(name);document.getElementById(id)?.scrollIntoView({behavior:'smooth'});}

 return <div className="room-app">
  <header className="topbar">
   <div className="mark"><span className="mark-sq">R</span><span><strong>room<span>grid</span></strong><small>Campus spaces</small></span></div>
   <nav>
    <button className={tab==='Availability'?'selected':''} onClick={()=>goTo('Availability','availability')}>Availability</button>
    <button className={tab==='My bookings'?'selected':''} onClick={()=>goTo('My bookings','my-reservations')}>My bookings</button>
    <button className="reset-btn" onClick={reset}>Reset demo</button>
   </nav>
   <div className="member"><span>Student dashboard</span><div className="profile">YOU</div></div>
  </header>
  <main>
   <section className="intro">
    <div><span className="eyebrow">SPACES / RESERVATIONS</span><h1>Find room availability</h1><p>Review campus rooms, dates and existing reservations in one view.</p></div>
    <div className="intro-summary"><span>ROOMS IN DIRECTORY</span><strong>{rooms.length.toString().padStart(2,'0')}</strong><span>CURRENT RESERVATIONS</span><strong>{bookings.length.toString().padStart(2,'0')}</strong></div>
   </section>
   <div className="pagegrid">
    <section className="calendar-pane" id="availability">
     <div className="calendar-head">
      <div><span className="eyebrow">AVAILABILITY CALENDAR</span><h2>Rooms by day</h2></div>
      <div className="weeknav"><button aria-label="Previous week" onClick={()=>setWeek(addDays(week,-7))}>←</button><strong>{human(week)} – {human(addDays(week,6))}</strong><button aria-label="Next week" onClick={()=>setWeek(addDays(week,7))}>→</button></div>
     </div>
     <div className="calendar-controls">
      <label>Location <select value={view} onChange={e=>setView(e.target.value)}><option>All rooms</option>{rooms.map(r=><option key={r}>{r}</option>)}</select></label>
      <span className="legend"><i className="free"/> Open</span>
      <span className="legend"><i className="sel"/> Your selection</span>
      <span className="legend"><i className="mine"/> Your booking</span>
      <span className="legend"><i className="booked"/> Reserved by others</span>
      <p>Click an open day to start, then a later day in the same row to set the end. Click your own booking to change it.</p>
     </div>
     {gridNote&&<div className="grid-note" role="status">{gridNote}</div>}
     <div className="calendar-scroll"><div className="room-cal">
      <div className="corner">ROOM / DATE</div>
      {days.map(d=><div className="dayhead" key={d}><strong>{weekDay(d)}</strong><span>{human(d)}</span></div>)}
      {roomList.map(room=><React.Fragment key={room}>
       <div className="roomname"><strong>{room}</strong><small>Study room · {room[0]}</small></div>
       {days.map(day=>{
        const b=occupied(room,day);
        const editingThis=!!b&&b.id===editing;
        const free=!b||editingThis;
        const mine=!!b&&b.owner==='you';
        const sel=inSelection(room,day);
        const conflict=sel&&!free;
        const isAnchor=!!anchor&&anchor.room===room&&anchor.date===day;
        let cls='slot '+(free?'available':mine?'mine':'taken');
        if(sel)cls+=' selected';
        if(conflict)cls+=' conflict';
        if(isAnchor)cls+=' anchor';
        const state=editingThis?'your booking being changed':free?'open':mine?'your booking':'reserved by another student';
        const hint=free?(anchor&&anchor.room===room&&day>=anchor.date?'Click to end the selection here.':'Click to start a booking.'):mine?'Click to change this booking.':'Not available.';
        const label=conflict?'Conflict':sel?'Selected':free?'Open':mine?'Yours':'Booked';
        return <button key={room+day} type="button" className={cls} aria-label={`${room}, ${weekDay(day)} ${human(day)}: ${state}${sel?', in your selection':''}. ${hint}`} title={`${room}, ${human(day)}: ${state}. ${hint}`} onClick={()=>clickCell(room,day)}>
         <span>{label}</span>
         {!free&&<small>{mine?'Click to change':'Reserved'}</small>}
         {editingThis&&!sel&&<small>Current dates</small>}
        </button>;
       })}
      </React.Fragment>)}
     </div></div>
     <p className="calendar-note">Your selection is checked against every existing booking. If any selected day is already reserved, it is marked as a conflict before you submit.</p>
     <section id="my-reservations" className="reservations">
      <div className="reservations-head"><h2>Your bookings</h2><span>{myBookings.length} current records</span></div>
      <div className="reservations-list">
       {myBookings.map(b=><article key={b.id} className={'reservation'+(b.id===editing?' is-editing':'')}>
        <div className="room-chip">{b.roomNumber}</div>
        <div className="reservation-body"><strong>{rangeLabel(b.startDate,b.endDate)}</strong><small>{b.purpose||'No purpose entered'}</small></div>
        <button onClick={()=>edit(b)} aria-label={`Change booking ${b.roomNumber}, ${rangeLabel(b.startDate,b.endDate)}`}>{b.id===editing?'Editing…':'Change'}</button>
       </article>)}
       {myBookings.length===0&&<p>No reservations.</p>}
      </div>
     </section>
    </section>
    <aside className="booking-pane" id="booking-form">
     <div className="panel-tag"><span>BOOK A ROOM</span><span>FORM 01</span></div>
     <h2>{editing?'Change reservation':'Make a reservation'}</h2>
     <p className="booking-description">Use this panel to request a room for your study group, meeting or activity.</p>
     {notice&&<div className="success" role="status">{notice}</div>}
     {error&&<div className="error" role="alert" id="form-error">{error.message}</div>}
     <form onSubmit={submit} noValidate>
      <label><span>Room number</span><input list="rooms" placeholder="e.g., B2-104" value={form.roomNumber} onChange={e=>setField('roomNumber',e.target.value)} {...fieldProps('roomNumber')}/><datalist id="rooms">{rooms.map(r=><option key={r} value={r}/>)}</datalist></label>
      <div className="date-pair">
       <label><span>Start date</span><input type="date" value={form.startDate} onChange={e=>setField('startDate',e.target.value)} {...fieldProps('startDate')}/></label>
       <label><span>End date (check-out)</span><input type="date" value={form.endDate} onChange={e=>setField('endDate',e.target.value)} {...fieldProps('endDate')}/></label>
      </div>
      {rangeOk&&<p className="range-summary">Reserves <strong>{rangeLabel(form.startDate,form.endDate)}</strong>. The room is free again on {weekDay(form.endDate)} {human(form.endDate)}.</p>}
      <label><span>Purpose / optional</span><textarea rows="4" placeholder="Meeting, group study..." value={form.purpose} onChange={e=>setField('purpose',e.target.value)}/></label>
      <p className="helper">The end date is the check-out day: the booking covers the start date up to, but not including, the end date. Reservations cannot overlap existing bookings for the same room.</p>
      <button className="availability-check" type="button" onClick={check}>Check availability</button>
      <button className="reserve-button" type="submit">{editing?'Save booking':'Confirm booking'}</button>
      {editing&&<button className="cancel-edit" type="button" onClick={cancelEdit}>Cancel editing</button>}
     </form>
     <div className="right-foot"><span>✦</span> Need a room for a group? Find an open date and submit your request.</div>
    </aside>
   </div>
  </main>
  <footer>ROOMGRID / Academic campus demo — local browser data only.</footer>
 </div>;
}
