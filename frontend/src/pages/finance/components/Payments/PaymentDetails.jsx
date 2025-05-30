import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const CreatePaymentModal = ({ isOpen, onClose, onSave }) => {
  const [formData, setFormData] = React.useState({
    amount: '',
    payment_type: 'contribution',
    payment_method: 'cash',
    status: 'pending'
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...formData,
      id: Math.floor(Math.random() * 1000), 
      amount: parseFloat(formData.amount)
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Payment</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Amount</Label>
            <Input
              type="number"
              name="amount"
              value={formData.amount}
              onChange={handleChange}
              required
            />
          </div>
          
          <div>
            <Label>Payment Type</Label>
            <Select 
              name="payment_type"
              value={formData.payment_type}
              onValueChange={(value) => setFormData({...formData, payment_type: value})}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="contribution">Contribution</SelectItem>
                <SelectItem value="penalty">Penalty</SelectItem>
                <SelectItem value="monthly">Monthly Fee</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label>Payment Method</Label>
            <Select 
              name="payment_method"
              value={formData.payment_method}
              onValueChange={(value) => setFormData({...formData, payment_method: value})}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="mobile_money">Mobile Money</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">Save</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreatePaymentModal;