import { useRef,useState } from "react"
import { sendEmail } from "./functions/functions";
import "./App.css"
import "@fontsource/poppins";
import Rihanyo from './assets/Rihanyo.png';;



function App() {
  const [email,setemail] = useState("");
  const [sent,setsent] = useState(false);
  
  const popup=useRef(0);
  const open_popup=()=>{
    popup.current.show();


  };
  const close_popup=()=>{
    popup.current.close();
        console.log("closing", popup.current);
         popup.current.removeAttribute('open');

  };



 async function send_email(){

  const result=await sendEmail(email);
  if(result.success){
    setsent(true);
    console.log(result);
alert(`An email has been sent to ${email}. Please check your inbox.`);   
 setemail("");

  }else{
    alert("We were unable to send to this email address. Please try again later.");
  }

 } 

  
   return (
  <section className="Body">
    <header>

      
      <img src={Rihanyo} alt="Rihanyo logo" style={{ width: '100px', height: 'auto' }} />
      <section className="headerlinks">
      <a href="#">Home</a>
      <a href="#">About us</a>
      <a href="#">View practices</a>
      <a href="#">Contact</a>
      </section>
     
    </header>
    <section className="header" >

        <h1 className="heading" style={{fontFamily:"Playfair Display", }}>Register Your Practice</h1>
<p>Join our growing network of trusted medical practices across South Africa and give your patients a seamless, modern way to book appointments online.</p>
 <a className="mbut" href="#apply">
  <button>Skip to application</button>
</a>
    </section>
<section className="split">
  <img src="https://images.pexels.com/photos/5452195/pexels-photo-5452195.jpeg" alt="picture" style={{width:"20vw", height:"30vh"}}/>
<p>
  Join our growing network of trusted medical practices across South Africa
  and give your patients a seamless, modern way to book appointments online.
  We are committed to making healthcare more accessible for everyone, and it
  all starts with connecting patients to the right practice at the right time.
   Whether you are a general practitioner, specialist, dental practice,
  physiotherapist, or a multi-disciplinary clinic, our platform is built to
  fit your unique needs. No matter the size of your practice, we have the
  tools to help you manage your appointments more efficiently and reduce the
  administrative burden on your staff.
</p>
</section>

<p>
  Say goodbye to missed calls, double bookings, and long waiting lists. Our
  intelligent scheduling system allows patients to view your available time
  slots in real time and book at their own convenience — whether it is early
  in the morning or late at night. Your reception team will spend less time
  on the phone and more time focused on delivering excellent patient care.
</p>

<p>
  Patient information is handled with the highest level of security and
  confidentiality. Our platform is fully compliant with the Protection of
  Personal Information Act (POPIA), so you can have complete peace of mind
  knowing that your patients' data is always protected.
</p>

<p>
  Once your practice is registered, you will have access to a dedicated
  dashboard where you can manage bookings, update your availability, view
  patient appointment history, and generate reports — all from one easy-to-use
  interface. Our support team is also available to assist you every step of
  the way.
</p>

<p>
  Getting started is quick and straightforward. The registration process takes
  less than five minutes to complete, and once your application has been
  reviewed and approved, your practice will be live and visible to patients in
  your area within 24 hours. There are no hidden fees and no long-term
  contracts — just a simple, affordable solution designed with South African
  medical practices in mind.
</p>

<p>
  Thousands of patients in your area are already searching for medical
  practices online. Make sure your practice is visible, accessible, and ready
  to welcome them. Join the practices that are already saving time, reducing
  no-shows, and improving the overall patient experience through our platform.
</p>

<p>
  Click the link below to register your practice and take the first step
  towards a smarter, more efficient way of managing your appointments. We look
  forward to welcoming you to our network.
</p>

<a id="apply" href="#" onClick={open_popup}><button>Click here to register your practice</button></a>


    <dialog ref={popup}>
      <section>
        <p>Please enter your email address to get started:</p>
        <form onSubmit={send_email}>
          <input type="email" placeholder="Enter email address" value={email} 
          onChange={(e)=>setemail(e.target.value)}/>
            <button onClick={()=>{send_email(); close_popup() }}>Submit</button>
        </form>
        <button type="button" onClick={close_popup}>close</button>


      </section>
    </dialog>
  </section>
);

}



export default App
