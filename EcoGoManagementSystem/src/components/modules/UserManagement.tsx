import { useState, useEffect, useCallback } from 'react';
import { Search, Edit, UserX } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { Label } from '@/components/ui/label';
import { fetchUserList, fetchUserDetail, updateUser, updateUserStatus, type User, type UpdateUserRequest } from '@/services/userService';
import { toast } from 'sonner';

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeactivateDialogOpen, setIsDeactivateDialogOpen] = useState(false);
  const [userToDeactivate, setUserToDeactivate] = useState<User | null>(null);

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetchUserList(page, pageSize);
      if (response.code === 200) {
        setUsers(response.data.list);
        setTotalUsers(response.data.total);
        setTotalPages(Math.ceil(response.data.total / pageSize));
      } else {
        toast.error(response.message || 'Failed to fetch users');
      }
    } catch (error) {
      console.error(error);
      toast.error('An error occurred while fetching users');
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const filteredUsers = users.filter(user =>
    (user.nickname || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.userid || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEdit = async (user: User) => {
    setIsEditDialogOpen(true);
    setEditingUser(null); // Clear previous to show loading state if needed or show partial? 
    // Showing partial data first is better UX, but we want full details.
    // Let's set basic data first, then fetch.
    setEditingUser({ ...user });

    try {
      const response = await fetchUserDetail(user.userid);
      if (response.code === 200) {
        setEditingUser(response.data);
        toast.success(`Loaded details for ${response.data.nickname}`);
      } else {
        toast.error(response.message || 'Failed to fetch user details');
      }
    } catch (error) {
      console.error(error);
      toast.error('Error fetching user details');
    }
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;

    try {
      const payload: UpdateUserRequest = {
        nickname: editingUser.nickname,
        email: editingUser.email,
        isVipActive: editingUser.vip?.active || false,
        isDeactivated: editingUser.isDeactivated || false,
        vipPlan: 'vip',
        vipExpiryDate: editingUser.vip?.expiryDate
          ? new Date(editingUser.vip.expiryDate).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0]
      };

      const response = await updateUser(editingUser.userid, payload);
      const res = response as { code?: number | string; message?: string; success?: boolean };
      if (res && (res.code === 200 || res.success)) {
        toast.success('User updated successfully');
        setIsEditDialogOpen(false);
        setEditingUser(null);
        loadUsers();
      } else {
        toast.error(res?.message || 'Failed to update user');
      }
    } catch (error: unknown) {
      console.error(error);
      const msg = (error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Error updating user';
      toast.error(msg);
    }
  };

  const handleDeactivateClick = (user: User) => {
    setUserToDeactivate(user);
    setIsDeactivateDialogOpen(true);
  };

  const handleDeactivateConfirm = async () => {
    if (!userToDeactivate) return;

    try {
      const response = await updateUserStatus(userToDeactivate.userid, true);
      const res = response as { code?: number | string; message?: string };

      if (res && (res.code === 200 || res.code === '200' || res.message?.toLowerCase().includes('success'))) {
        toast.success(`User ${userToDeactivate.nickname} has been deactivated`);
        setUserToDeactivate(null);
        setIsDeactivateDialogOpen(false); // Close dialog
        loadUsers();
      } else {
        toast.error(res?.message || 'Failed to deactivate user');
      }
    } catch (error) {
      console.error(error);
      toast.error('Error handling deactivation');
    }
  };



  // Helper to format date
  const formatDate = (dateStr: string | null, type: 'date' | 'datetime' = 'date') => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);

    // SG format
    const options: Intl.DateTimeFormatOptions = type === 'date'
      ? { day: '2-digit', month: '2-digit', year: 'numeric' } // DD/MM/YYYY
      : {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: false // DD/MM/YYYY HH:mm
      };

    return date.toLocaleString('en-SG', options);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
        <p className="text-gray-600 mt-1">Manage system user accounts and permissions</p>
      </div>

      {/* Statistics (Note: accurate global stats usually come from a separate dashboard API) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Users</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{totalUsers}</p>
              </div>
              <div className="size-12 bg-blue-50 rounded-lg flex items-center justify-center">
                <span className="text-2xl text-blue-600">👥</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* These stats are currently based on the FETCHED page, which is not ideal, but keeping structure */}
        {/* In a real scenario, you'd want a separate /stats API */}
      </div>

      {/* User List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">User List</CardTitle>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                <Input
                  placeholder="Search by nickname, email or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-64"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto bg-white rounded-md shadow-sm">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-center py-4 px-4 text-sm font-medium text-gray-600 w-[100px]">User ID</th>
                  <th className="text-left py-4 px-4 text-sm font-medium text-gray-600">Nickname</th>
                  <th className="text-left py-4 px-4 text-sm font-medium text-gray-600">Email</th>
                  <th className="text-center py-4 px-4 text-sm font-medium text-gray-600 whitespace-nowrap">User Type</th>
                  <th className="text-center py-4 px-4 text-sm font-medium text-gray-600 whitespace-nowrap">Status</th>
                  <th className="text-center py-4 px-4 text-sm font-medium text-gray-600 whitespace-nowrap">Registered Date</th>
                  <th className="text-center py-4 px-4 text-sm font-medium text-gray-600 whitespace-nowrap">Last Login</th>
                  <th className="text-center py-4 px-4 text-sm font-medium text-gray-600 whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-gray-500">Loading users...</td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-gray-500">No users found.</td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-4 px-4 text-sm text-gray-900 text-center break-words max-w-[100px]">{user.userid}</td>
                      <td className="py-4 px-4 text-sm font-medium text-gray-900 text-left break-words max-w-[160px]">{user.nickname}</td>
                      <td className="py-4 px-4 text-sm text-gray-600 text-left break-words max-w-[220px]">{user.email || '-'}</td>
                      <td className="py-4 px-4 text-center whitespace-nowrap">
                        <Badge className={user.vip?.active ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'}>
                          {user.vip?.active ? 'VIP' : 'Normal'}
                        </Badge>
                      </td>
                      <td className="py-4 px-4 text-center whitespace-nowrap">
                        <Badge className={!user.isDeactivated ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                          {!user.isDeactivated ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-600 text-center whitespace-nowrap">{formatDate(user.createdAt, 'date')}</td>
                      <td className="py-4 px-4 text-sm text-gray-600 text-center whitespace-nowrap">{formatDate(user.lastLoginAt, 'datetime')}</td>
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(user)}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          >
                            <Edit className="size-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeactivateClick(user)}
                            disabled={user.isDeactivated}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 disabled:opacity-50"
                          >
                            <UserX className="size-4 mr-1" />
                            Deactivate
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-gray-100 mt-4">
              <div className="text-sm text-gray-500">
                Page {page} of {totalPages}
              </div>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Prev
                </Button>

                {/* Numbered Pagination */}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  // Simple sliding window logic
                  let pageNum = page;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }

                  return (
                    <Button
                      key={pageNum}
                      variant={page === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPage(pageNum)}
                      className="w-8"
                    >
                      {pageNum}
                    </Button>
                  );
                })}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit User Information</DialogTitle>
            <DialogDescription>
              Update user account information and permission settings
            </DialogDescription>
          </DialogHeader>
          {editingUser ? (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="nickname">Nickname</Label>
                <Input
                  id="nickname"
                  value={editingUser.nickname}
                  onChange={(e) => setEditingUser(curr => curr ? { ...curr, nickname: e.target.value } : null)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={editingUser.email || ''}
                  onChange={(e) => setEditingUser(curr => curr ? { ...curr, email: e.target.value } : null)}
                />
              </div>

              {/* VIP Status Switch */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="vip-status">VIP Status</Label>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="vip-status"
                      checked={editingUser.vip?.active || false}
                      onCheckedChange={(checked) => setEditingUser(curr => {
                        if (!curr) return null;
                        return {
                          ...curr,
                          vip: {
                            ...curr.vip!,
                            active: checked,
                            // Set defaults if activating and fields are missing
                            plan: checked ? (curr.vip?.plan || 'MONTHLY') : curr.vip?.plan,
                            expiryDate: checked ? (curr.vip?.expiryDate || new Date().toISOString()) : curr.vip?.expiryDate
                          }
                        };
                      })}
                    />
                    <span className="text-sm text-gray-600">{editingUser.vip?.active ? 'Active' : 'Inactive'}</span>
                  </div>
                </div>
              </div>

              {/* Conditional VIP Fields */}
              {editingUser.vip?.active && (
                <>


                  <div className="space-y-2">
                    <Label>Expiry Date</Label>
                    <Input
                      type="date"
                      value={editingUser.vip?.expiryDate ? new Date(editingUser.vip.expiryDate).toISOString().split('T')[0] : ''}
                      onChange={(e) => setEditingUser(curr => {
                        if (!curr) return null;
                        return { ...curr, vip: { ...curr.vip!, expiryDate: e.target.value } };
                      })}
                    />
                  </div>
                </>
              )}

              {/* Account Status Switch */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="account-status">Account Status</Label>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="account-status"
                      checked={!editingUser.isDeactivated}
                      onCheckedChange={(checked) => setEditingUser(curr => curr ? { ...curr, isDeactivated: !checked } : null)}
                      className={!editingUser.isDeactivated ? "data-[state=checked]:bg-green-600" : "data-[state=unchecked]:bg-red-600"}
                    />
                    <span className={!editingUser.isDeactivated ? "text-sm text-green-600 font-medium" : "text-sm text-red-600 font-medium"}>
                      {!editingUser.isDeactivated ? 'Active' : 'Deactivated'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-gray-500">Loading user details...</div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivate User Confirmation Dialog */}
      <Dialog open={isDeactivateDialogOpen} onOpenChange={setIsDeactivateDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirm Account Deactivation</DialogTitle>
            <DialogDescription>
              Are you sure you want to deactivate user <span className="font-semibold text-gray-900">{userToDeactivate?.nickname}</span>?
              This action will prevent the user from logging into the system.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeactivateDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeactivateConfirm}>
              Confirm Deactivation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div >
  );
}
