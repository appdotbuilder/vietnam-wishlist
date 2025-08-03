
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { trpc } from '@/utils/trpc';
import type { 
  Place, 
  CreatePlaceInput, 
  UpdatePlaceInput, 
  PlaceStats, 
  LoginInput
} from '../../server/src/schema';
import { vietnameseCities, placeTypes } from '../../server/src/schema';
import { MapPin, Heart, BarChart3, LogOut, Eye, EyeOff, Trash2, Edit } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

// Using localStorage for user management since auth handlers are stubs
interface User {
  id: number;
  name: string;
  email: string;
}

function App() {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [places, setPlaces] = useState<Place[]>([]);
  const [stats, setStats] = useState<PlaceStats>({
    total_places: 0,
    visited_places: 0,
    unvisited_places: 0,
    places_by_city: {},
    places_by_type: {}
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingPlace, setEditingPlace] = useState<Place | null>(null);

  // Authentication form state
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authData, setAuthData] = useState<LoginInput & { name?: string }>({
    email: '',
    password: '',
    name: ''
  });

  // Place form state
  const [placeFormData, setPlaceFormData] = useState<Omit<CreatePlaceInput, 'user_id'>>({
    name: '',
    address: '',
    google_maps_url: null,
    google_place_id: null,
    type: 'restaurant',
    city: 'Ho Chi Minh City',
    notes: null
  });

  // Filters
  const [filters, setFilters] = useState({
    city: 'all' as string,
    type: 'all' as string,
    visited: 'all' as string
  });

  // Load user places
  const loadPlaces = useCallback(async () => {
    if (!user) return;
    try {
      setIsLoading(true);
      const filterInput = {
        user_id: user.id,
        ...(filters.city !== 'all' && { city: filters.city as (typeof vietnameseCities)[number] }),
        ...(filters.type !== 'all' && { type: filters.type as (typeof placeTypes)[number] }),
        ...(filters.visited !== 'all' && { is_visited: filters.visited === 'visited' })
      };
      const result = await trpc.getUserPlaces.query(filterInput);
      setPlaces(result);
    } catch (error) {
      setError('Failed to load places');
      console.error('Failed to load places:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, filters]);

  // Load user statistics
  const loadStats = useCallback(async () => {
    if (!user) return;
    try {
      const result = await trpc.getUserStats.query({ user_id: user.id });
      setStats(result);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadPlaces();
      loadStats();
    }
  }, [user, loadPlaces, loadStats]);

  // Authentication handlers
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      // Since auth handlers are stubs, create demo user
      const demoUser: User = {
        id: 1,
        name: authData.name || 'Demo User',
        email: authData.email
      };
      setUser(demoUser);
      localStorage.setItem('user', JSON.stringify(demoUser));
      
      setAuthData({ email: '', password: '', name: '' });
    } catch (error) {
      setError('Authentication failed');
      console.error('Auth error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
    setPlaces([]);
    setStats({
      total_places: 0,
      visited_places: 0,
      unvisited_places: 0,
      places_by_city: {},
      places_by_type: {}
    });
  };

  // Place management handlers
  const handleCreatePlace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const createInput: CreatePlaceInput = {
        ...placeFormData,
        user_id: user.id,
        google_maps_url: placeFormData.google_maps_url || null,
        notes: placeFormData.notes || null
      };
      
      const newPlace = await trpc.createPlace.mutate(createInput);
      setPlaces((prev: Place[]) => [newPlace, ...prev]);
      
      // Reset form
      setPlaceFormData({
        name: '',
        address: '',
        google_maps_url: null,
        google_place_id: null,
        type: 'restaurant',
        city: 'Ho Chi Minh City',
        notes: null
      });
      
      // Reload stats
      loadStats();
    } catch (error) {
      setError('Failed to create place');
      console.error('Failed to create place:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePlace = async (place: Place, updates: Partial<Place>) => {
    setIsLoading(true);
    setError(null);

    try {
      const updateInput: UpdatePlaceInput = {
        id: place.id,
        user_id: place.user_id,
        ...updates
      };
      
      await trpc.updatePlace.mutate(updateInput);
      setPlaces((prev: Place[]) => 
        prev.map((p: Place) => p.id === place.id ? { ...p, ...updates } : p)
      );
      setEditingPlace(null);
      loadStats();
    } catch (error) {
      setError('Failed to update place');
      console.error('Failed to update place:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeletePlace = async (placeId: number) => {
    if (!user) return;
    
    setIsLoading(true);
    setError(null);

    try {
      await trpc.deletePlace.mutate({ id: placeId, user_id: user.id });
      setPlaces((prev: Place[]) => prev.filter((p: Place) => p.id !== placeId));
      loadStats();
    } catch (error) {
      setError('Failed to delete place');
      console.error('Failed to delete place:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleVisited = (place: Place) => {
    handleUpdatePlace(place, { is_visited: !place.is_visited });
  };

  // Format place type for display
  const formatPlaceType = (type: string) => {
    return type.split('_').map((word: string) => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  // Get place type icon
  const getTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      restaurant: '🍽️',
      cafe: '☕',
      park: '🌳',
      museum: '🏛️',
      beach: '🏖️',
      temple: '🏯',
      market: '🛒',
      shopping_mall: '🛍️',
      hotel: '🏨',
      attraction: '🎯',
      bar: '🍺',
      nightlife: '🌃',
      entertainment: '🎭',
      cultural_site: '🏺',
      nature: '🌿',
      other: '📍'
    };
    return icons[type] || '📍';
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-md mx-auto mt-20">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">🇻🇳 Vietnam Places</CardTitle>
              <CardDescription>
                Discover and save your favorite places across Vietnam
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={authMode} onValueChange={(value) => setAuthMode(value as 'login' | 'register')}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="login">Login</TabsTrigger>
                  <TabsTrigger value="register">Register</TabsTrigger>
                </TabsList>
                
                <form onSubmit={handleAuth} className="space-y-4 mt-6">
                  {authMode === 'register' && (
                    <Input
                      placeholder="Full Name"
                      value={authData.name || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setAuthData((prev) => ({ ...prev, name: e.target.value }))
                      }
                      required
                    />
                  )}
                  
                  <Input
                    type="email"
                    placeholder="Email"
                    value={authData.email}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setAuthData((prev) => ({ ...prev, email: e.target.value }))
                    }
                    required
                  />
                  
                  <Input
                    type="password"
                    placeholder="Password"
                    value={authData.password}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setAuthData((prev) => ({ ...prev, password: e.target.value }))
                    }
                    required
                  />
                  
                  {error && (
                    <Alert>
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? 'Processing...' : (authMode === 'login' ? 'Login' : 'Create Account')}
                  </Button>
                </form>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold text-gray-900">🇻🇳 Vietnam Places</h1>
              <Badge variant="secondary">Welcome, {user.name}!</Badge>
            </div>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {error && (
          <Alert className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="places" className="space-y-6">
          <TabsList>
            <TabsTrigger value="places">
              <MapPin className="w-4 h-4 mr-2" />
              My Places
            </TabsTrigger>
            <TabsTrigger value="add">
              <Heart className="w-4 h-4 mr-2" />
              Add Place
            </TabsTrigger>
            <TabsTrigger value="stats">
              <BarChart3 className="w-4 h-4 mr-2" />
              Statistics
            </TabsTrigger>
          </TabsList>

          {/* Places Tab */}
          <TabsContent value="places" className="space-y-6">
            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Filter Places</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                  <Label htmlFor="city-filter">City</Label>
                  <Select 
                    value={filters.city || 'all'} 
                    onValueChange={(value: string) => setFilters((prev) => ({ ...prev, city: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Cities</SelectItem>
                      {vietnameseCities.map((city) => (
                        <SelectItem key={city} value={city}>{city}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex-1 min-w-[200px]">
                  <Label htmlFor="type-filter">Type</Label>
                  <Select 
                    value={filters.type || 'all'} 
                    onValueChange={(value: string) => setFilters((prev) => ({ ...prev, type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {placeTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {getTypeIcon(type)} {formatPlaceType(type)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex-1 min-w-[200px]">
                  <Label htmlFor="visited-filter">Status</Label>
                  <Select 
                    value={filters.visited || 'all'} 
                    onValueChange={(value: string) => setFilters((prev) => ({ ...prev, visited: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Places</SelectItem>
                      <SelectItem value="visited">Visited</SelectItem>
                      <SelectItem value="unvisited">Not Visited</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Places Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {places.length === 0 ? (
                <Card className="col-span-full p-8 text-center">
                  <p className="text-gray-500">No places found. Add your first favorite place!</p>
                </Card>
              ) : (
                places.map((place: Place) => (
                  <Card key={place.id} className={`${place.is_visited ? 'bg-green-50 border-green-200' : ''}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg flex items-center gap-2">
                            {getTypeIcon(place.type)} {place.name}
                          </CardTitle>
                          <CardDescription className="mt-1">
                            📍 {place.city}
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleVisited(place)}
                            className={place.is_visited ? 'text-green-600' : 'text-gray-400'}
                          >
                            {place.is_visited ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingPlace(place)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-red-600">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Place</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{place.name}"? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => handleDeletePlace(place.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-2">
                        <p className="text-sm text-gray-600">{place.address}</p>
                        <Badge variant="outline">{formatPlaceType(place.type)}</Badge>
                        {place.is_visited && (
                          <Badge variant="default" className="bg-green-600">
                            ✓ Visited
                          </Badge>
                        )}
                        {place.notes && (
                          <p className="text-sm text-gray-500 italic">"{place.notes}"</p>
                        )}
                        {place.google_maps_url && (
                          <a 
                            href={place.google_maps_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline text-sm flex items-center gap-1"
                          >
                            🗺️ View on Google Maps
                          </a>
                        )}
                        <p className="text-xs text-gray-400">
                          Added: {place.created_at.toLocaleDateString()}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* Add Place Tab */}
          <TabsContent value="add">
            <Card>
              <CardHeader>
                <CardTitle>Add New Favorite Place</CardTitle>
                <CardDescription>
                  Save a place you'd like to visit in Vietnam
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreatePlace} className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="name">Place Name *</Label>
                      <Input
                        id="name"
                        placeholder="e.g., Pho 24 Restaurant"
                        value={placeFormData.name}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setPlaceFormData((prev) => ({ ...prev, name: e.target.value }))
                        }
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="city">City *</Label>
                      <Select 
                        value={placeFormData.city || 'Ho Chi Minh City'} 
                        onValueChange={(value: (typeof vietnameseCities)[number]) => setPlaceFormData((prev) => ({ ...prev, city: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {vietnameseCities.map((city) => (
                            <SelectItem key={city} value={city}>{city}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="type">Type *</Label>
                      <Select 
                        value={placeFormData.type || 'restaurant'} 
                        onValueChange={(value: (typeof placeTypes)[number]) => setPlaceFormData((prev) => ({ ...prev, type: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {placeTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                              {getTypeIcon(type)} {formatPlaceType(type)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="google_maps">Google Maps URL</Label>
                      <Input
                        id="google_maps"
                        placeholder="https://maps.google.com/..."
                        value={placeFormData.google_maps_url || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setPlaceFormData((prev) => ({ ...prev, google_maps_url: e.target.value || null }))
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Address *</Label>
                    <Input
                      id="address"
                      placeholder="e.g., 123 Le Loi Street, District 1"
                      value={placeFormData.address}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setPlaceFormData((prev) => ({ ...prev, address: e.target.value }))
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      placeholder="Any special notes about this place..."
                      value={placeFormData.notes || ''}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                        setPlaceFormData((prev) => ({ ...prev, notes: e.target.value || null }))
                      }
                    />
                  </div>

                  <Button type="submit" disabled={isLoading} className="w-full">
                    {isLoading ? 'Adding Place...' : '❤️ Add to Favorites'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Statistics Tab */}
          <TabsContent value="stats" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Places</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.total_places}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Visited</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{stats.visited_places}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Not Visited</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">{stats.unvisited_places}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Visit Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {stats.total_places > 0 
                      ? Math.round((stats.visited_places / stats.total_places) * 100)
                      : 0
                    }%
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {/* Places by City */}
              <Card>
                <CardHeader>
                  <CardTitle>Places by City</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {Object.keys(stats.places_by_city).length === 0 ? (
                    <p className="text-gray-500">No places added yet</p>
                  ) : (
                    Object.entries(stats.places_by_city).map(([city, count]) => (
                      <div key={city} className="flex justify-between items-center">
                        <span>{city}</span>
                        <Badge variant="secondary">{count}</Badge>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              {/* Places by Type */}
              <Card>
                <CardHeader>
                  <CardTitle>Places by Type</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {Object.keys(stats.places_by_type).length === 0 ? (
                    <p className="text-gray-500">No places added yet</p>
                  ) : (
                    Object.entries(stats.places_by_type).map(([type, count]) => (
                      <div key={type} className="flex justify-between items-center">
                        <span className="flex items-center gap-2">
                          {getTypeIcon(type)} {formatPlaceType(type)}
                        </span>
                        <Badge variant="secondary">{count}</Badge>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Place Dialog */}
      {editingPlace && (
        <AlertDialog open={!!editingPlace} onOpenChange={() => setEditingPlace(null)}>
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle>Edit Place</AlertDialogTitle>
            </AlertDialogHeader>
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={editingPlace.is_visited}
                  onCheckedChange={(checked: boolean) => 
                    setEditingPlace((prev) => prev ? { ...prev, is_visited: checked } : null)
                  }
                />
                <Label>Mark as visited</Label>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={editingPlace.notes || ''}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setEditingPlace((prev) => prev ? { ...prev, notes: e.target.value || null } : null)
                  }
                  placeholder="Add your notes..."
                />
              </div>
            </div>
            <AlertDialogFooter className="gap-2">
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => editingPlace && handleUpdatePlace(editingPlace, {
                  is_visited: editingPlace.is_visited,
                  notes: editingPlace.notes
                })}
              >
                Save Changes
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

export default App;
