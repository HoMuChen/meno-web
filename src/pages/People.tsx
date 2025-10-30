import { useState, useEffect } from 'react'
import type { FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import api, { ApiException } from '@/lib/api'
import { formatDate } from '@/lib/formatters'
import type { Person, CreatePersonRequest, UpdatePersonRequest, PeopleResponse } from '@/types/person'
import { SocialMediaIcons } from '@/components/SocialMediaIcons'

export function PeoplePage() {
  const [people, setPeople] = useState<Person[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [personToDelete, setPersonToDelete] = useState<Person | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [personToEdit, setPersonToEdit] = useState<Person | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [updateError, setUpdateError] = useState<string | null>(null)

  // Form state for create
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [company, setCompany] = useState('')
  const [notes, setNotes] = useState('')
  const [linkedin, setLinkedin] = useState('')
  const [twitter, setTwitter] = useState('')
  const [facebook, setFacebook] = useState('')
  const [instagram, setInstagram] = useState('')
  const [github, setGithub] = useState('')

  // Form state for edit
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editCompany, setEditCompany] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [editLinkedin, setEditLinkedin] = useState('')
  const [editTwitter, setEditTwitter] = useState('')
  const [editFacebook, setEditFacebook] = useState('')
  const [editInstagram, setEditInstagram] = useState('')
  const [editGithub, setEditGithub] = useState('')

  // Fetch people
  const fetchPeople = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await api.get<PeopleResponse>('/api/people?limit=100')
      if (response.success && response.data) {
        setPeople(response.data.people)
      }
    } catch (err) {
      if (err instanceof ApiException) {
        setError(err.message || 'Failed to fetch people')
      } else {
        setError('Unable to connect to the server')
      }
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchPeople()
  }, [])

  // Reset create form
  const resetCreateForm = () => {
    setName('')
    setEmail('')
    setPhone('')
    setCompany('')
    setNotes('')
    setLinkedin('')
    setTwitter('')
    setFacebook('')
    setInstagram('')
    setGithub('')
  }

  // Handle create person
  const handleCreatePerson = async (e: FormEvent) => {
    e.preventDefault()
    setCreateError(null)
    setIsCreating(true)

    try {
      const personData: CreatePersonRequest = {
        name: name.trim(),
      }

      if (email.trim()) personData.email = email.trim()
      if (phone.trim()) personData.phone = phone.trim()
      if (company.trim()) personData.company = company.trim()
      if (notes.trim()) personData.notes = notes.trim()

      const socialMedia: Record<string, string> = {}
      if (linkedin.trim()) socialMedia.linkedin = linkedin.trim()
      if (twitter.trim()) socialMedia.twitter = twitter.trim()
      if (facebook.trim()) socialMedia.facebook = facebook.trim()
      if (instagram.trim()) socialMedia.instagram = instagram.trim()
      if (github.trim()) socialMedia.github = github.trim()

      if (Object.keys(socialMedia).length > 0) {
        personData.socialMedia = socialMedia
      }

      const response = await api.post<{ success: boolean; data: Person }>(
        '/api/people',
        personData
      )

      if (response.success) {
        setIsCreateDialogOpen(false)
        resetCreateForm()
        fetchPeople()
      }
    } catch (err) {
      if (err instanceof ApiException) {
        setCreateError(err.message || 'Failed to create person')
      } else {
        setCreateError('Unable to connect to the server')
      }
    } finally {
      setIsCreating(false)
    }
  }

  // Handle delete person
  const handleDeletePerson = async () => {
    if (!personToDelete) return

    try {
      setIsDeleting(true)
      setDeleteError(null)
      await api.delete(`/api/people/${personToDelete._id}`)
      await fetchPeople()
      setPersonToDelete(null)
    } catch (err) {
      if (err instanceof ApiException) {
        setDeleteError(err.message || 'Failed to delete person')
      } else {
        setDeleteError('Unable to connect to the server')
      }
    } finally {
      setIsDeleting(false)
    }
  }

  // Open edit dialog with person data
  const handleOpenEditDialog = (person: Person) => {
    setPersonToEdit(person)
    setEditName(person.name)
    setEditEmail(person.email || '')
    setEditPhone(person.phone || '')
    setEditCompany(person.company || '')
    setEditNotes(person.notes || '')
    setEditLinkedin(person.socialMedia?.linkedin || '')
    setEditTwitter(person.socialMedia?.twitter || '')
    setEditFacebook(person.socialMedia?.facebook || '')
    setEditInstagram(person.socialMedia?.instagram || '')
    setEditGithub(person.socialMedia?.github || '')
    setUpdateError(null)
    setIsEditDialogOpen(true)
  }

  // Handle update person
  const handleUpdatePerson = async (e: FormEvent) => {
    e.preventDefault()
    if (!personToEdit) return

    setUpdateError(null)
    setIsUpdating(true)

    try {
      const updateData: UpdatePersonRequest = {
        name: editName.trim(),
      }

      if (editEmail.trim()) updateData.email = editEmail.trim()
      if (editPhone.trim()) updateData.phone = editPhone.trim()
      if (editCompany.trim()) updateData.company = editCompany.trim()
      if (editNotes.trim()) updateData.notes = editNotes.trim()

      const socialMedia: Record<string, string> = {}
      if (editLinkedin.trim()) socialMedia.linkedin = editLinkedin.trim()
      if (editTwitter.trim()) socialMedia.twitter = editTwitter.trim()
      if (editFacebook.trim()) socialMedia.facebook = editFacebook.trim()
      if (editInstagram.trim()) socialMedia.instagram = editInstagram.trim()
      if (editGithub.trim()) socialMedia.github = editGithub.trim()

      if (Object.keys(socialMedia).length > 0) {
        updateData.socialMedia = socialMedia
      }

      const response = await api.put<{ success: boolean; data: Person }>(
        `/api/people/${personToEdit._id}`,
        updateData
      )

      if (response.success && response.data) {
        await fetchPeople()
        setIsEditDialogOpen(false)
        setPersonToEdit(null)
      }
    } catch (err) {
      if (err instanceof ApiException) {
        setUpdateError(err.message || 'Failed to update person')
      } else {
        setUpdateError('Unable to connect to the server')
      }
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-4 sm:px-4 lg:px-6">
      {/* Header */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-0.5">
          <h1 className="text-xl font-bold tracking-tight text-primary sm:text-2xl">People</h1>
          <p className="text-sm text-muted-foreground">
            Manage your contacts, clients, and team members
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto" size="default">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mr-2"
                aria-hidden="true"
              >
                <path d="M5 12h14" />
                <path d="M12 5v14" />
              </svg>
              Add Person
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleCreatePerson}>
              <DialogHeader>
                <DialogTitle>Add New Person</DialogTitle>
                <DialogDescription>
                  Add a new contact, client, or team member
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                {createError && (
                  <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                    {createError}
                  </div>
                )}

                <div className="grid gap-2">
                  <Label htmlFor="name">
                    Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    minLength={2}
                    maxLength={100}
                    disabled={isCreating}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isCreating}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    placeholder="+1234567890"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    maxLength={20}
                    disabled={isCreating}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="company">Company</Label>
                  <Input
                    id="company"
                    placeholder="Acme Corporation"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    maxLength={100}
                    disabled={isCreating}
                  />
                </div>

                <div className="grid gap-2">
                  <Label>Social Media</Label>
                  <div className="space-y-2">
                    <Input
                      placeholder="LinkedIn URL"
                      value={linkedin}
                      onChange={(e) => setLinkedin(e.target.value)}
                      disabled={isCreating}
                    />
                    <Input
                      placeholder="Twitter URL"
                      value={twitter}
                      onChange={(e) => setTwitter(e.target.value)}
                      disabled={isCreating}
                    />
                    <Input
                      placeholder="Facebook URL"
                      value={facebook}
                      onChange={(e) => setFacebook(e.target.value)}
                      disabled={isCreating}
                    />
                    <Input
                      placeholder="Instagram URL"
                      value={instagram}
                      onChange={(e) => setInstagram(e.target.value)}
                      disabled={isCreating}
                    />
                    <Input
                      placeholder="GitHub URL"
                      value={github}
                      onChange={(e) => setGithub(e.target.value)}
                      disabled={isCreating}
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Additional notes..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    maxLength={1000}
                    rows={4}
                    disabled={isCreating}
                    className="resize-none"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                  disabled={isCreating}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isCreating}>
                  {isCreating ? 'Adding...' : 'Add Person'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Error state */}
      {error && !isLoading && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive sm:p-6">
          <div className="flex items-start gap-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mt-0.5 shrink-0"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" x2="12" y1="8" y2="12" />
              <line x1="12" x2="12.01" y1="16" y2="16" />
            </svg>
            <div className="flex-1">
              <p className="font-medium">Error loading people</p>
              <p className="mt-1 text-xs opacity-90">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && people.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8 sm:py-10">
            <div className="mb-4 rounded-full bg-primary/10 p-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-primary"
                aria-hidden="true"
              >
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <h3 className="mb-2 text-lg font-semibold sm:text-xl">No people yet</h3>
            <p className="mb-6 max-w-sm text-center text-sm text-muted-foreground sm:text-base">
              Get started by adding your first contact
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)} size="lg" className="min-h-[44px]">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mr-2"
                aria-hidden="true"
              >
                <path d="M5 12h14" />
                <path d="M12 5v14" />
              </svg>
              Add Your First Person
            </Button>
          </CardContent>
        </Card>
      )}

      {/* People Table */}
      {!isLoading && !error && people.length > 0 && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell">Email</TableHead>
                <TableHead className="hidden lg:table-cell">Phone</TableHead>
                <TableHead className="hidden lg:table-cell">Company</TableHead>
                <TableHead className="hidden xl:table-cell">Social</TableHead>
                <TableHead className="hidden sm:table-cell">Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                // Loading skeleton rows
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="h-4 w-40 animate-pulse rounded bg-muted" />
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="h-4 w-28 animate-pulse rounded bg-muted" />
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="h-4 w-36 animate-pulse rounded bg-muted" />
                    </TableCell>
                    <TableCell className="hidden xl:table-cell">
                      <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="ml-auto h-8 w-8 animate-pulse rounded bg-muted" />
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                people.map((person) => (
                  <TableRow key={person._id}>
                    <TableCell className="font-medium">
                      <div>
                        <div>{person.name}</div>
                        {/* Show email on mobile if exists */}
                        {person.email && (
                          <div className="mt-1 text-xs text-muted-foreground md:hidden">
                            {person.email}
                          </div>
                        )}
                        {/* Show social media icons on mobile */}
                        <SocialMediaIcons
                          socialMedia={person.socialMedia}
                          size={14}
                          className="mt-2 xl:hidden"
                        />
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {person.email || '-'}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {person.phone || '-'}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {person.company || '-'}
                    </TableCell>
                    <TableCell className="hidden xl:table-cell">
                      {person.socialMedia && (
                        Object.values(person.socialMedia).some(value => value) ? (
                          <SocialMediaIcons socialMedia={person.socialMedia} />
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )
                      ) || <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">
                      {formatDate(person.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            aria-label="Actions"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <circle cx="12" cy="12" r="1" />
                              <circle cx="12" cy="5" r="1" />
                              <circle cx="12" cy="19" r="1" />
                            </svg>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            className="cursor-pointer"
                            onClick={() => handleOpenEditDialog(person)}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="mr-2"
                            >
                              <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                              <path d="m15 5 4 4" />
                            </svg>
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
                            onClick={() => setPersonToDelete(person)}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="mr-2"
                            >
                              <path d="M3 6h18" />
                              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                            </svg>
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Edit Person Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => !open && setIsEditDialogOpen(false)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[500px]">
          <form onSubmit={handleUpdatePerson}>
            <DialogHeader>
              <DialogTitle>Edit Person</DialogTitle>
              <DialogDescription>Update person information</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {updateError && (
                <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                  {updateError}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="edit-name">
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="edit-name"
                  placeholder="John Doe"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  minLength={2}
                  maxLength={100}
                  disabled={isUpdating}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  placeholder="john@example.com"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  disabled={isUpdating}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-phone">Phone</Label>
                <Input
                  id="edit-phone"
                  placeholder="+1234567890"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  maxLength={20}
                  disabled={isUpdating}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-company">Company</Label>
                <Input
                  id="edit-company"
                  placeholder="Acme Corporation"
                  value={editCompany}
                  onChange={(e) => setEditCompany(e.target.value)}
                  maxLength={100}
                  disabled={isUpdating}
                />
              </div>

              <div className="space-y-2">
                <Label>Social Media</Label>
                <div className="space-y-2">
                  <Input
                    placeholder="LinkedIn URL"
                    value={editLinkedin}
                    onChange={(e) => setEditLinkedin(e.target.value)}
                    disabled={isUpdating}
                  />
                  <Input
                    placeholder="Twitter URL"
                    value={editTwitter}
                    onChange={(e) => setEditTwitter(e.target.value)}
                    disabled={isUpdating}
                  />
                  <Input
                    placeholder="Facebook URL"
                    value={editFacebook}
                    onChange={(e) => setEditFacebook(e.target.value)}
                    disabled={isUpdating}
                  />
                  <Input
                    placeholder="Instagram URL"
                    value={editInstagram}
                    onChange={(e) => setEditInstagram(e.target.value)}
                    disabled={isUpdating}
                  />
                  <Input
                    placeholder="GitHub URL"
                    value={editGithub}
                    onChange={(e) => setEditGithub(e.target.value)}
                    disabled={isUpdating}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-notes">Notes</Label>
                <Textarea
                  id="edit-notes"
                  placeholder="Additional notes..."
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  maxLength={1000}
                  rows={4}
                  disabled={isUpdating}
                  className="resize-none"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
                disabled={isUpdating}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isUpdating || !editName.trim()}>
                {isUpdating ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!personToDelete} onOpenChange={(open) => !open && setPersonToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Person</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{personToDelete?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {deleteError && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {deleteError}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setPersonToDelete(null)
                setDeleteError(null)
              }}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeletePerson}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
