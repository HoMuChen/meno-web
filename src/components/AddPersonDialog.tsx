import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

interface AddPersonDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  isCreating: boolean
  personName: string
  personCompany: string
  onNameChange: (name: string) => void
  onCompanyChange: (company: string) => void
}

export function AddPersonDialog({
  open,
  onOpenChange,
  onConfirm,
  isCreating,
  personName,
  personCompany,
  onNameChange,
  onCompanyChange,
}: AddPersonDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Person</DialogTitle>
          <DialogDescription>
            Create a new person and assign the speaker to them. All transcriptions with this speaker will be updated.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label htmlFor="person-name" className="text-sm font-medium">
              Name <span className="text-destructive">*</span>
            </label>
            <Input
              id="person-name"
              value={personName}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="Enter person name"
              disabled={isCreating}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="person-company" className="text-sm font-medium">
              Company
            </label>
            <Input
              id="person-company"
              value={personCompany}
              onChange={(e) => onCompanyChange(e.target.value)}
              placeholder="Enter company name (optional)"
              disabled={isCreating}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isCreating}
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isCreating || !personName.trim()}
          >
            {isCreating ? 'Creating...' : 'Create & Assign'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
