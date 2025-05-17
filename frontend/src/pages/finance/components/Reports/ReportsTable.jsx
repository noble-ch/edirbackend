import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Plus, Eye } from 'lucide-react';
import GenerateReportModal from './GenerateReportModal';
import ReportDetails from './ReportDetails';

const ReportsTable = () => {
  const [reports, setReports] = useState([
    { id: 1, title: 'Monthly Report - May 2025', report_type: 'monthly' }
  ]);
  
  const [isGenerateModalOpen, setGenerateModalOpen] = useState(false);
  const [isDetailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button onClick={() => setGenerateModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Generate Report
        </Button>
      </div>
      
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reports.map((report) => (
            <TableRow key={report.id}>
              <TableCell>{report.id}</TableCell>
              <TableCell>{report.title}</TableCell>
              <TableCell>{report.report_type}</TableCell>
              <TableCell>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => {
                    setSelectedReport(report);
                    setDetailsModalOpen(true);
                  }}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Modals */}
      <GenerateReportModal 
        isOpen={isGenerateModalOpen} 
        onClose={() => setGenerateModalOpen(false)}
        onGenerate={(newReport) => {
          setReports([...reports, newReport]);
          setGenerateModalOpen(false);
        }}
      />
      
      {selectedReport && (
        <ReportDetails
          isOpen={isDetailsModalOpen}
          onClose={() => setDetailsModalOpen(false)}
          report={selectedReport}
        />
      )}
    </div>
  );
};

export default ReportsTable;