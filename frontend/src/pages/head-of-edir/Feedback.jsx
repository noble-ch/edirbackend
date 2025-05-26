import React, { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ExclamationTriangleIcon } from "@radix-ui/react-icons";
import { useParams } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

function Feedback() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [responseText, setResponseText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { edirslug } = useParams();

  useEffect(() => {
    fetchFeedbacks();
  }, [edirslug]);

  const fetchFeedbacks = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("accessToken");
      const response = await fetch(
        `http://127.0.0.1:8000/api/${edirslug}/feedbacks/`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch feedbacks");
      }

      const data = await response.json();
      setFeedbacks(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (feedback) => {
    setSelectedFeedback(feedback);
    setResponseText(feedback.response || "");
    setIsDialogOpen(true);
  };

  const handleSubmitResponse = async () => {
    if (!responseText.trim()) {
      toast.error("Response cannot be empty");
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("accessToken");
      const response = await fetch(
        `http://127.0.0.1:8000/api/${edirslug}/feedbacks/${selectedFeedback.id}/`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            response: responseText,
            status: "resolved",
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update feedback");
      }

      const updatedFeedback = await response.json();

      // Update the local state
      setFeedbacks(
        feedbacks.map((f) =>
          f.id === updatedFeedback.id ? updatedFeedback : f
        )
      );
      setSelectedFeedback(updatedFeedback);

      toast.success("Feedback response submitted successfully");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseFeedback = async () => {
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("accessToken");
      const response = await fetch(
        `http://127.0.0.1:8000/api/${edirslug}/feedbacks/${selectedFeedback.id}/`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: "closed",
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to close feedback");
      }

      const updatedFeedback = await response.json();

      // Update the local state
      setFeedbacks(
        feedbacks.map((f) =>
          f.id === updatedFeedback.id ? updatedFeedback : f
        )
      );
      setSelectedFeedback(updatedFeedback);

      toast.success("Feedback closed successfully");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "open":
        return <Badge className="bg-blue-500">Open</Badge>;
      case "in_review":
        return <Badge className="bg-yellow-500">In Review</Badge>;
      case "resolved":
        return <Badge className="bg-green-500">Resolved</Badge>;
      case "closed":
        return <Badge variant="secondary">Closed</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getCategoryBadge = (category) => {
    switch (category) {
      case "general":
        return <Badge variant="outline">General</Badge>;
      case "suggestion":
        return <Badge className="bg-purple-500">Suggestion</Badge>;
      case "complaint":
        return <Badge variant="destructive">Complaint</Badge>;
      case "appreciation":
        return <Badge className="bg-green-500">Appreciation</Badge>;
      default:
        return <Badge>{category}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <ExclamationTriangleIcon className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}. Please try again later.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Member Feedback</CardTitle>
            <Button variant="outline">Submit New Feedback</Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableCaption>A list of member feedback submissions.</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Subject</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {feedbacks.map((feedback) => (
                <TableRow key={feedback.id}>
                  <TableCell className="font-medium">
                    {feedback.subject}
                  </TableCell>
                  <TableCell>{getCategoryBadge(feedback.category)}</TableCell>
                  <TableCell>{getStatusBadge(feedback.status)}</TableCell>
                  <TableCell>
                    {new Date(feedback.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewDetails(feedback)}
                    >
                      View Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {feedbacks.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No feedback submissions found.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Feedback Detail Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[625px]">
          {selectedFeedback && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedFeedback.subject}</DialogTitle>
                <div className="flex gap-2 mt-2">
                  {getCategoryBadge(selectedFeedback.category)}
                  {getStatusBadge(selectedFeedback.status)}
                </div>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium">Feedback Message</h4>
                  <p className="text-sm mt-1 text-gray-600">
                    {selectedFeedback.message}
                  </p>
                </div>

                <Separator />

                <div>
                  <h4 className="text-sm font-medium">Submitted On</h4>
                  <p className="text-sm mt-1 text-gray-600">
                    {new Date(selectedFeedback.created_at).toLocaleString()}
                  </p>
                </div>

                {selectedFeedback.response && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="text-sm font-medium">Admin Response</h4>
                      <p className="text-sm mt-1 text-gray-600">
                        {selectedFeedback.response}
                      </p>
                      {selectedFeedback.responded_at && (
                        <p className="text-xs mt-1 text-gray-500">
                          Responded on:{" "}
                          {new Date(
                            selectedFeedback.responded_at
                          ).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </>
                )}

                {selectedFeedback.status !== "closed" && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="text-sm font-medium mb-2">
                        {selectedFeedback.response
                          ? "Update Response"
                          : "Add Response"}
                      </h4>
                      <Textarea
                        value={responseText}
                        onChange={(e) => setResponseText(e.target.value)}
                        placeholder="Enter your response here..."
                        className="min-h-[100px]"
                      />
                    </div>
                  </>
                )}
              </div>
              <DialogFooter>
                {selectedFeedback.status !== "closed" && (
                  <>
                    <Button
                      onClick={handleSubmitResponse}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "Submitting..." : "Submit Response"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleCloseFeedback}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "Processing..." : "Close Feedback"}
                    </Button>
                  </>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default Feedback;
