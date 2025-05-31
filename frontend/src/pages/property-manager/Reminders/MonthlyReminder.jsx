import React from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";

function MonthlyReminder() {
  // Get the edirslug from URL parameters
  const { edirslug } = useParams();

  const handleSendReminders = async () => {
    try {
      const accessToken = localStorage.getItem("accessToken");
      const response = await axios.post(
        `http://127.0.0.1:8000/api/${edirslug}/reminders/send_monthly_reminders/`,
        {},
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      console.log("Reminders sent successfully:", response.data);
      alert("Monthly reminders sent successfully!");
    } catch (error) {
      console.error("Error sending reminders:", error);
      alert("Failed to send reminders. Please try again.");
    }
  };

  return (
    <div>
      <Button onClick={handleSendReminders} className="mx-2">
        Monthly Reminder
      </Button>
    </div>
  );
}

export default MonthlyReminder;
