import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, UserPlus } from "lucide-react";

interface AuthorizedEmail {
  id: string;
  email: string;
  phone: string;
  full_name: string | null;
  is_registered: boolean;
  gender: string;
  hostel: string | null;
  is_visible: boolean;
  created_at: string;
}

const ManageUsers = () => {
  const [users, setUsers] = useState<AuthorizedEmail[]>([]);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [fullName, setFullName] = useState("");
  const [gender, setGender] = useState("male");
  const [hostel, setHostel] = useState("");
  const [isVisible, setIsVisible] = useState("yes");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    const { data } = await supabase
      .from("authorized_emails")
      .select("*")
      .order("created_at", { ascending: false });
    setUsers(data || []);
  };

  const addUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !phone.trim()) return;
    setLoading(true);

    const { error } = await supabase.from("authorized_emails").insert({
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      full_name: fullName.trim() || null,
      gender,
      hostel: gender === "female" ? hostel || null : null,
      is_visible: isVisible === "yes",
    });

    if (error) {
      toast({
        title: "Error",
        description: error.code === "23505" ? "Email already exists" : error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "User added", description: `${email} has been authorized.` });
      setEmail("");
      setPhone("");
      setFullName("");
      setGender("male");
      setHostel("");
      setIsVisible("yes");
      loadUsers();
    }
    setLoading(false);
  };

  const removeUser = async (id: string, userEmail: string) => {
    const { error } = await supabase.from("authorized_emails").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Removed", description: `${userEmail} has been removed.` });
      loadUsers();
    }
  };

  const visibleUsers = users.filter((u) => u.is_visible);
  const boysCount = visibleUsers.filter((u) => u.gender === "male").length;
  const girlsCount = visibleUsers.filter((u) => u.gender === "female").length;

  return (
    <div className="space-y-6">
      {/* Add User Form */}
      <Card className="shadow-card border-0">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-accent" />
            Add Authorized User
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={addUser} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1">
              <Label>Full Name</Label>
              <Input
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label>Password (Phone)</Label>
              <Input
                placeholder="1234567890"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Gender</Label>
              <RadioGroup value={gender} onValueChange={setGender} className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="male" id="male" />
                  <Label htmlFor="male" className="cursor-pointer">Male</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="female" id="female" />
                  <Label htmlFor="female" className="cursor-pointer">Female</Label>
                </div>
              </RadioGroup>
            </div>

            <AnimatePresence>
              {gender === "female" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-1"
                >
                  <Label>Hostel Name</Label>
                  <Select value={hostel} onValueChange={setHostel}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select hostel" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Kaveri">Kaveri</SelectItem>
                      <SelectItem value="Amravathi">Amravathi</SelectItem>
                    </SelectContent>
                  </Select>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-2">
              <Label>Visible in Results?</Label>
              <RadioGroup value={isVisible} onValueChange={setIsVisible} className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="yes" id="vis-yes" />
                  <Label htmlFor="vis-yes" className="cursor-pointer">Yes</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="no" id="vis-no" />
                  <Label htmlFor="vis-no" className="cursor-pointer">No</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="flex items-end sm:col-span-2 lg:col-span-3">
              <Button type="submit" disabled={loading} className="w-full sm:w-auto gradient-accent text-accent-foreground hover:opacity-90">
                <Plus className="w-4 h-4 mr-1" /> Add User
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Summary Counts */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="shadow-card border-0">
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-primary">{boysCount}</p>
            <p className="text-sm text-muted-foreground">Boys (Visible)</p>
          </CardContent>
        </Card>
        <Card className="shadow-card border-0">
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-accent">{girlsCount}</p>
            <p className="text-sm text-muted-foreground">Girls (Visible)</p>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card className="shadow-card border-0">
        <CardHeader>
          <CardTitle className="text-lg">
            Authorized Users ({users.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No users added yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Gender</TableHead>
                    <TableHead>Hostel</TableHead>
                    <TableHead>Visible</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u, i) => (
                    <motion.tr
                      key={u.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.03 }}
                      className="border-b"
                    >
                      <TableCell>{u.full_name || "—"}</TableCell>
                      <TableCell className="font-medium">{u.email}</TableCell>
                      <TableCell className="capitalize">{u.gender}</TableCell>
                      <TableCell>{u.gender === "female" ? u.hostel || "—" : "—"}</TableCell>
                      <TableCell>
                        <Badge variant={u.is_visible ? "default" : "secondary"}>
                          {u.is_visible ? "Yes" : "No"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={u.is_registered ? "default" : "secondary"}>
                          {u.is_registered ? "Registered" : "Pending"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeUser(u.id, u.email)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ManageUsers;
