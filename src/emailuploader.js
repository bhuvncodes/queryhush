import { db } from './firebase';
import { setDoc, doc } from 'firebase/firestore';

const allowedEmails = [
  // Students
  "student1@bvrit.ac.in",
  "student2@bvrit.ac.in",
  "student3@bvrit.ac.in",
  "student4@bvrit.ac.in",
  "student5@bvrit.ac.in",
  

  // Faculty
  "faculty1@bvrit.ac.in",
  "faculty2@bvrit.ac.in",
  "faculty3@bvrit.ac.in",

  // Admins
  "admin1@bvrit.ac.in",
  "admin2@bvrit.ac.in",

  // Superadmin
  "superadmin@bvrit.ac.in"
];

const rolesMap = {
  "student": ["student1@bvrit.ac.in", "student2@bvrit.ac.in", "student3@bvrit.ac.in", "student4@bvrit.ac.in", "student5@bvrit.ac.in"],
  "faculty": ["faculty1@bvrit.ac.in", "faculty2@bvrit.ac.in", "faculty3@bvrit.ac.in"],
  "admin": ["admin1@bvrit.ac.in", "admin2@bvrit.ac.in"],
  "superadmin": ["superadmin@bvrit.ac.in"]
};

export const uploadEmails = async () => {
  try {
    for (let email of allowedEmails) {
      let role = "student";

      if (rolesMap.faculty.includes(email)) {
        role = "faculty";
      } else if (rolesMap.admin.includes(email)) {
        role = "admin";
      } else if (rolesMap.superadmin.includes(email)) {
        role = "superadmin";
      }

      await setDoc(doc(db, "allowedEmails", email), {
        email,
        role,
        createdAt: new Date().toISOString()
      });
      console.log(`✅ Uploaded: ${email} as ${role}`);
    }
    console.log("🎉 All emails uploaded successfully!");
  } catch (error) {
    console.error("❌ Error uploading emails:", error);
  }
};
