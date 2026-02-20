import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Target,
  Plus,
  Edit2,
  Trash2,
  Users,
  Calendar,
  Award,
  TrendingUp,
  CheckCircle,
  Clock,
  XCircle,
  Flame,
  Eye,
  Filter,
  MapPin,
  Leaf,
  Route
} from 'lucide-react';
import { challengeApi, type Challenge, type UserChallengeProgressDTO } from '@/api/challengeApi';

type ChallengeType = 'GREEN_TRIPS_DISTANCE' | 'CARBON_SAVED' | 'GREEN_TRIPS_COUNT';
type ChallengeStatus = 'ACTIVE' | 'COMPLETED' | 'EXPIRED';

export function ChallengeManagement() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<ChallengeStatus | 'ALL'>('ALL');
  const [filterType, setFilterType] = useState<ChallengeType | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
  const [newChallenge, setNewChallenge] = useState<Partial<Challenge>>({
    title: '',
    description: '',
    type: 'GREEN_TRIPS_COUNT',
    target: 10,
    reward: 100,
    badge: '',
    icon: '🎯',
    status: 'ACTIVE',
    participants: 0,
  });
  const [participantProgress, setParticipantProgress] = useState<UserChallengeProgressDTO[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);

  // Fetch challenges from API
  useEffect(() => {
    fetchChallenges();
  }, []);

  const fetchChallenges = async () => {
    try {
      setLoading(true);
      const data = await challengeApi.getAllChallenges();
      setChallenges(data);
    } catch (error) {
      console.error('Failed to fetch challenges:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter challenges
  const filteredChallenges = challenges.filter(challenge => {
    const matchesStatus = filterStatus === 'ALL' || challenge.status === filterStatus;
    const matchesType = filterType === 'ALL' || challenge.type === filterType;
    const matchesSearch =
      challenge.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      challenge.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesType && matchesSearch;
  });

  // Statistics
  const stats = {
    total: challenges.length,
    active: challenges.filter(c => c.status === 'ACTIVE').length,
    expired: challenges.filter(c => c.status === 'EXPIRED').length,
    totalParticipants: challenges.reduce((sum, c) => sum + (c.participants || 0), 0),
    totalRewards: challenges.reduce((sum, c) => sum + ((c.reward || 0) * (c.participants || 0)), 0),
  };

  const getChallengeTypeInfo = (type: ChallengeType) => {
    const types = {
      GREEN_TRIPS_DISTANCE: {
        label: 'Distance',
        icon: <Route className="size-4" />,
        color: 'bg-blue-100 text-blue-700',
        unit: 'km'
      },
      CARBON_SAVED: {
        label: 'Carbon Saved',
        icon: <Leaf className="size-4" />,
        color: 'bg-green-100 text-green-700',
        unit: 'g'
      },
      GREEN_TRIPS_COUNT: {
        label: 'Trip Count',
        icon: <MapPin className="size-4" />,
        color: 'bg-purple-100 text-purple-700',
        unit: 'trips'
      },
    };
    return types[type] || types.GREEN_TRIPS_COUNT;
  };

  const getStatusBadge = (status: ChallengeStatus) => {
    const styles = {
      ACTIVE: 'bg-green-100 text-green-700',
      COMPLETED: 'bg-blue-100 text-blue-700',
      EXPIRED: 'bg-gray-100 text-gray-700',
    };
    return <Badge className={styles[status]}>{status}</Badge>;
  };

  const getStatusIcon = (status: ChallengeStatus) => {
    switch (status) {
      case 'ACTIVE':
        return <Flame className="size-4 text-green-600" />;
      case 'COMPLETED':
        return <CheckCircle className="size-4 text-blue-600" />;
      case 'EXPIRED':
        return <XCircle className="size-4 text-gray-600" />;
    }
  };

  const handleAddChallenge = async () => {
    try {
      const challenge = await challengeApi.createChallenge({
        title: newChallenge.title || '',
        description: newChallenge.description || '',
        type: newChallenge.type as ChallengeType || 'GREEN_TRIPS_COUNT',
        target: newChallenge.target || 10,
        reward: newChallenge.reward || 100,
        badge: newChallenge.badge || '',
        icon: newChallenge.icon || '🎯',
        status: newChallenge.status as ChallengeStatus || 'ACTIVE',
        participants: 0,
        startTime: newChallenge.startTime,
        endTime: newChallenge.endTime,
      });

      setChallenges([...challenges, challenge]);
      setIsAddDialogOpen(false);
      setNewChallenge({
        title: '',
        description: '',
        type: 'GREEN_TRIPS_COUNT',
        target: 10,
        reward: 100,
        badge: '',
        icon: '🎯',
        status: 'ACTIVE',
        participants: 0,
      });
    } catch (error) {
      console.error('Failed to create challenge:', error);
    }
  };

  const handleEditChallenge = async () => {
    if (!selectedChallenge || !selectedChallenge.id) return;

    try {
      const updated = await challengeApi.updateChallenge(selectedChallenge.id, selectedChallenge);
      setChallenges(challenges.map(c =>
        c.id === selectedChallenge.id ? updated : c
      ));
      setIsEditDialogOpen(false);
      setSelectedChallenge(null);
    } catch (error) {
      console.error('Failed to update challenge:', error);
    }
  };

  const handleDeleteChallenge = async (id: string) => {
    if (confirm('Are you sure you want to delete this challenge?')) {
      try {
        await challengeApi.deleteChallenge(id);
        setChallenges(challenges.filter(c => c.id !== id));
      } catch (error) {
        console.error('Failed to delete challenge:', error);
      }
    }
  };

  const handleViewParticipants = async (challenge: Challenge) => {
    setSelectedChallenge(challenge);
    setIsViewDialogOpen(true);
    setLoadingParticipants(true);
    setParticipantProgress([]);

    try {
      if (challenge.id) {
        const participants = await challengeApi.getChallengeParticipants(challenge.id);
        setParticipantProgress(participants);
      }
    } catch (error) {
      console.error('Failed to fetch participants:', error);
    } finally {
      setLoadingParticipants(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-gray-500">Loading challenges...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="p-6 bg-white border-b">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Challenge Management</h2>
            <p className="text-gray-600 mt-1">Manage eco-friendly challenges and rewards</p>
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)} className="bg-green-600 hover:bg-green-700">
            <Plus className="size-4 mr-2" />
            Create Challenge
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-5 bg-gradient-to-br from-green-500 to-green-600 text-white">
            <div className="flex items-center justify-between mb-3">
              <Target className="size-8 opacity-80" />
              <Badge className="bg-white/20 text-white">Challenges</Badge>
            </div>
            <p className="text-sm opacity-90 mb-1">Total Challenges</p>
            <p className="text-3xl font-bold">{stats.total}</p>
            <div className="mt-3 pt-3 border-t border-white/20">
              <div className="flex items-center justify-between text-sm">
                <span>Active: {stats.active}</span>
                <span>Expired: {stats.expired}</span>
              </div>
            </div>
          </Card>

          <Card className="p-5 bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <div className="flex items-center justify-between mb-3">
              <Users className="size-8 opacity-80" />
              <Badge className="bg-white/20 text-white">Engagement</Badge>
            </div>
            <p className="text-sm opacity-90 mb-1">Total Participants</p>
            <p className="text-3xl font-bold">{stats.totalParticipants.toLocaleString()}</p>
            <div className="mt-3 pt-3 border-t border-white/20 flex items-center gap-2 text-sm">
              <TrendingUp className="size-4" />
              <span>High engagement rate</span>
            </div>
          </Card>

          <Card className="p-5 bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <div className="flex items-center justify-between mb-3">
              <Award className="size-8 opacity-80" />
              <Badge className="bg-white/20 text-white">Rewards</Badge>
            </div>
            <p className="text-sm opacity-90 mb-1">Total Rewards</p>
            <p className="text-3xl font-bold">{stats.totalRewards.toLocaleString()}</p>
            <div className="mt-3 pt-3 border-t border-white/20">
              <p className="text-xs opacity-75">Points distributed to users</p>
            </div>
          </Card>

          <Card className="p-5 bg-gradient-to-br from-orange-500 to-orange-600 text-white">
            <div className="flex items-center justify-between mb-3">
              <Clock className="size-8 opacity-80" />
              <Badge className="bg-white/20 text-white">Status</Badge>
            </div>
            <p className="text-sm opacity-90 mb-1">Expired Challenges</p>
            <p className="text-3xl font-bold">{stats.expired}</p>
            <div className="mt-3 pt-3 border-t border-white/20">
              <p className="text-xs opacity-75">Out of {stats.total} total challenges</p>
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Input
                  placeholder="Search challenges..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Label>Type:</Label>
              <Select value={filterType} onValueChange={(value: ChallengeType | 'ALL') => setFilterType(value)}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Types</SelectItem>
                  <SelectItem value="GREEN_TRIPS_COUNT">Trip Count</SelectItem>
                  <SelectItem value="GREEN_TRIPS_DISTANCE">Distance</SelectItem>
                  <SelectItem value="CARBON_SAVED">Carbon Saved</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Label>Status:</Label>
              <Select value={filterStatus} onValueChange={(value: ChallengeStatus | 'ALL') => setFilterStatus(value)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Status</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="EXPIRED">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* Challenges Table */}
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="w-[50px]">Icon</TableHead>
                <TableHead>Challenge Info</TableHead>
                <TableHead className="text-center">Type</TableHead>
                <TableHead className="text-center">Target</TableHead>
                <TableHead className="text-center">Reward</TableHead>
                <TableHead className="text-center">Participants</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredChallenges.map((challenge, index) => {
                const typeInfo = getChallengeTypeInfo(challenge.type as ChallengeType);

                return (
                  <TableRow key={challenge.id || `temp-${index}`} className="hover:bg-gray-50">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{challenge.icon}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-gray-900">{challenge.title}</p>
                          {getStatusIcon(challenge.status as ChallengeStatus)}
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-1">{challenge.description}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {getStatusBadge(challenge.status as ChallengeStatus)}
                          <span className="text-xs text-gray-500">ID: {challenge.id?.slice(0, 20)}...</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={typeInfo.color}>
                        <div className="flex items-center gap-1">
                          {typeInfo.icon}
                          <span className="text-xs">{typeInfo.label}</span>
                        </div>
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <span className="font-semibold text-gray-900">{challenge.target}</span>
                        <span className="text-xs text-gray-500">{typeInfo.unit}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Award className="size-4 text-orange-500" />
                        <span className="font-semibold text-gray-900">{challenge.reward}</span>
                      </div>
                      {challenge.badge && (
                        <p className="text-xs text-gray-500 mt-1">+ Badge</p>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Users className="size-4 text-blue-600" />
                        <span className="font-semibold text-gray-900">{challenge.participants}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-xs text-gray-600">
                          <Calendar className="size-3" />
                          <span>Start: {formatDate(challenge.startTime)}</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-600">
                          <Clock className="size-3" />
                          <span>End: {formatDate(challenge.endTime)}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewParticipants(challenge)}
                          className="hover:bg-blue-50"
                        >
                          <Eye className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedChallenge(challenge);
                            setIsEditDialogOpen(true);
                          }}
                          className="hover:bg-green-50"
                        >
                          <Edit2 className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => challenge.id && handleDeleteChallenge(challenge.id)}
                          className="hover:bg-red-50 text-red-600"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      </div>

      {/* Add Challenge Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Challenge</DialogTitle>
            <DialogDescription>Set up a new eco-friendly challenge for users.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Title</Label>
                <Input
                  placeholder="Enter challenge title..."
                  value={newChallenge.title}
                  onChange={(e) => setNewChallenge({ ...newChallenge, title: e.target.value })}
                />
              </div>
              <div>
                <Label>Icon (Emoji)</Label>
                <Input
                  placeholder="🎯"
                  value={newChallenge.icon}
                  onChange={(e) => setNewChallenge({ ...newChallenge, icon: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                placeholder="Enter challenge description..."
                value={newChallenge.description}
                onChange={(e) => setNewChallenge({ ...newChallenge, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Challenge Type</Label>
                <Select value={newChallenge.type} onValueChange={(value: ChallengeType) => setNewChallenge({ ...newChallenge, type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GREEN_TRIPS_COUNT">Trip Count</SelectItem>
                    <SelectItem value="GREEN_TRIPS_DISTANCE">Distance</SelectItem>
                    <SelectItem value="CARBON_SAVED">Carbon Saved</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Target Value</Label>
                <Input
                  type="number"
                  value={newChallenge.target}
                  onChange={(e) => setNewChallenge({ ...newChallenge, target: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>Reward Points</Label>
                <Input
                  type="number"
                  value={newChallenge.reward}
                  onChange={(e) => setNewChallenge({ ...newChallenge, reward: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Badge ID (Optional)</Label>
                <Input
                  placeholder="badge_eco_master"
                  value={newChallenge.badge}
                  onChange={(e) => setNewChallenge({ ...newChallenge, badge: e.target.value })}
                />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={newChallenge.status} onValueChange={(value: ChallengeStatus) => setNewChallenge({ ...newChallenge, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                    <SelectItem value="EXPIRED">Expired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Time</Label>
                <Input
                  type="datetime-local"
                  onChange={(e) => setNewChallenge({ ...newChallenge, startTime: e.target.value })}
                />
              </div>
              <div>
                <Label>End Time</Label>
                <Input
                  type="datetime-local"
                  onChange={(e) => setNewChallenge({ ...newChallenge, endTime: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddChallenge} className="bg-green-600 hover:bg-green-700">Create Challenge</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Challenge Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Challenge</DialogTitle>
            <DialogDescription>Update challenge information.</DialogDescription>
          </DialogHeader>
          {selectedChallenge && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Title</Label>
                  <Input
                    value={selectedChallenge.title}
                    onChange={(e) => setSelectedChallenge({ ...selectedChallenge, title: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Icon (Emoji)</Label>
                  <Input
                    value={selectedChallenge.icon}
                    onChange={(e) => setSelectedChallenge({ ...selectedChallenge, icon: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={selectedChallenge.description}
                  onChange={(e) => setSelectedChallenge({ ...selectedChallenge, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Challenge Type</Label>
                  <Select value={selectedChallenge.type} onValueChange={(value: ChallengeType) => setSelectedChallenge({ ...selectedChallenge, type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GREEN_TRIPS_COUNT">Trip Count</SelectItem>
                      <SelectItem value="GREEN_TRIPS_DISTANCE">Distance</SelectItem>
                      <SelectItem value="CARBON_SAVED">Carbon Saved</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Target Value</Label>
                  <Input
                    type="number"
                    value={selectedChallenge.target}
                    onChange={(e) => setSelectedChallenge({ ...selectedChallenge, target: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Reward Points</Label>
                  <Input
                    type="number"
                    value={selectedChallenge.reward}
                    onChange={(e) => setSelectedChallenge({ ...selectedChallenge, reward: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Badge ID</Label>
                  <Input
                    value={selectedChallenge.badge || ''}
                    onChange={(e) => setSelectedChallenge({ ...selectedChallenge, badge: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={selectedChallenge.status} onValueChange={(value: ChallengeStatus) => setSelectedChallenge({ ...selectedChallenge, status: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="EXPIRED">Expired</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleEditChallenge} className="bg-green-600 hover:bg-green-700">Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Participants Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Challenge Details</DialogTitle>
            <DialogDescription>
              {selectedChallenge?.participants?.toLocaleString()} participants
            </DialogDescription>
          </DialogHeader>
          {selectedChallenge && (
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-green-50 to-blue-50 p-4 rounded-lg">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl">{selectedChallenge.icon}</span>
                  <div>
                    <p className="font-semibold text-gray-900">{selectedChallenge.title}</p>
                    <p className="text-sm text-gray-600">{selectedChallenge.description}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white p-3 rounded">
                    <p className="text-xs text-gray-600 mb-1">Target</p>
                    <p className="font-semibold text-gray-900">
                      {selectedChallenge.target} {getChallengeTypeInfo(selectedChallenge.type as ChallengeType).unit}
                    </p>
                  </div>
                  <div className="bg-white p-3 rounded">
                    <p className="text-xs text-gray-600 mb-1">Reward</p>
                    <p className="font-semibold text-gray-900">{selectedChallenge.reward} points</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  {getStatusBadge(selectedChallenge.status as ChallengeStatus)}
                  <Badge className={getChallengeTypeInfo(selectedChallenge.type as ChallengeType).color}>
                    {getChallengeTypeInfo(selectedChallenge.type as ChallengeType).label}
                  </Badge>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Participants Progress</p>
                {loadingParticipants ? (
                  <p className="text-sm text-gray-500 italic">Loading participants...</p>
                ) : participantProgress.length > 0 ? (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {participantProgress.map((progress) => (
                      <div key={progress.id} className="flex items-center justify-between p-3 bg-green-50 rounded">
                        <div className="flex items-center gap-2">
                          {progress.userAvatar ? (
                            <img src={progress.userAvatar} alt="" className="size-6 rounded-full" />
                          ) : (
                            <Users className="size-4 text-green-600" />
                          )}
                          <div>
                            <span className="text-sm font-medium text-gray-700">
                              {progress.userNickname || progress.userId}
                            </span>
                            {progress.userEmail && (
                              <p className="text-xs text-gray-500">{progress.userEmail}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="text-xs text-gray-600">
                              {progress.current} / {progress.target}
                            </p>
                            <div className="w-20 bg-gray-200 rounded-full h-1.5 mt-1">
                              <div
                                className={`h-1.5 rounded-full ${progress.status === 'COMPLETED' ? 'bg-green-600' : 'bg-blue-600'}`}
                                style={{ width: `${Math.min(progress.progressPercent, 100)}%` }}
                              />
                            </div>
                          </div>
                          <Badge className={progress.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}>
                            {progress.status === 'COMPLETED' ? 'Done' : `${progress.progressPercent.toFixed(0)}%`}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">No participants yet</p>
                )}
              </div>

              <div className="bg-gray-50 p-3 rounded">
                <p className="text-xs text-gray-600 mb-2">Duration</p>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="size-3 text-gray-500" />
                    <span className="text-gray-700">
                      {formatDate(selectedChallenge.startTime)} - {formatDate(selectedChallenge.endTime)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setIsViewDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
