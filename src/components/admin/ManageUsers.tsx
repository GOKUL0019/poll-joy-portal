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
import { Plus, Trash2, Upload } from "lucide-react";
import * as XLSX from "xlsx";

interface AuthorizedEmail {
  id: string;
  email: string;
  phone: string;
  full_name: string | null;
  is_registered: boolean;
  gender: string;
  hostel: string | null;
  created_at: string;
}

export default function ManageUsers() {
  const [users, setUsers] = useState<AuthorizedEmail[]>([]);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [fullName, setFullName] = useState("");
  const [gender, setGender] = useState("male");
  const [hostel, setHostel] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

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

  // ✅ ADD SINGLE USER
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
      is_registered: false,
    });

    if (error) {
      toast({
        title: "Error",
        description:
          error.code === "23505"
            ? "Email already exists"
            : error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "User added successfully 🎉" });
      setEmail("");
      setPhone("");
      setFullName("");
      setGender("male");
      setHostel("");
      loadUsers();
    }

    setLoading(false);
  };

  // ✅ DELETE USER
  const removeUser = async (id: string) => {
    await supabase.from("authorized_emails").delete().eq("id", id);
    toast({ title: "User removed" });
    loadUsers();
  };

  // ✅ BULK EXCEL UPLOAD
  const handleExcelUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);

    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const binaryStr = event.target?.result;
        const workbook = XLSX.read(binaryStr, { type: "binary" });

        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows: any[] = XLSX.utils.sheet_to_json(sheet);

        if (!rows.length) {
          toast({ title: "File is empty", variant: "destructive" });
          setUploading(false);
          return;
        }

        const formattedUsers = rows
          .filter(row => row.email && row.phone)
          .map(row => ({
            full_name: row.full_name?.toString().trim() || null,
            email: row.email.toString().trim().toLowerCase(),
            phone: row.phone.toString().trim(),
            gender: row.gender?.toString().toLowerCase() || "male",
            hostel:
              row.gender?.toString().toLowerCase() === "female"
                ? row.hostel || null
                : null,
            is_registered: false,
          }));

        const { error } = await supabase
          .from("authorized_emails")
          .upsert(formattedUsers, {
            onConflict: "email",
          });

        if (error) {
          toast({
            title: "Upload failed",
            description: error.message,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Upload Successful 🎉",
            description: `${formattedUsers.length} users processed.`,
          });
          loadUsers();
        }
      } catch (err) {
        toast({
          title: "Error reading file",
          variant: "destructive",
        });
      }

      setUploading(false);
    };

    reader.readAsBinaryString(file);
  };

  return (
    <div className="space-y-6">

      {/* ADD USER */}
      <Card>
        <CardHeader>
          <CardTitle>Add Authorized User</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={addUser} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

            <div>
              <Label>Full Name</Label>
              <Input value={fullName} onChange={(e)=>setFullName(e.target.value)} />
            </div>

            <div>
              <Label>Email</Label>
              <Input type="email" required value={email} onChange={(e)=>setEmail(e.target.value)} />
            </div>

            <div>
              <Label>Password (Phone)</Label>
              <Input required value={phone} onChange={(e)=>setPhone(e.target.value)} />
            </div>

            <div>
              <Label>Gender</Label>
              <RadioGroup value={gender} onValueChange={setGender} className="flex gap-4">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="male" id="male" />
                  <Label htmlFor="male">Male</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="female" id="female" />
                  <Label htmlFor="female">Female</Label>
                </div>
              </RadioGroup>
            </div>

            <AnimatePresence>
              {gender === "female" && (
                <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}} exit={{opacity:0,height:0}}>
                  <Label>Hostel</Label>
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

            <div className="lg:col-span-3">
              <Button type="submit" disabled={loading}>
                <Plus className="w-4 h-4 mr-1"/> Add User
              </Button>
            </div>

          </form>
        </CardContent>
      </Card>

      {/* BULK UPLOAD */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" /> Bulk Upload Users
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Input type="file" accept=".xlsx,.xls,.csv" onChange={handleExcelUpload} />
          {uploading && <p className="text-sm mt-2">Uploading users...</p>}
        </CardContent>
      </Card>

      {/* USER TABLE */}
      <Card>
        <CardHeader>
          <CardTitle>Authorized Users ({users.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Gender</TableHead>
                  <TableHead>Hostel</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u,i)=>(
                  <motion.tr key={u.id} initial={{opacity:0}} animate={{opacity:1}} transition={{delay:i*0.02}}>
                    <TableCell>{u.full_name || "—"}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell className="capitalize">{u.gender}</TableCell>
                    <TableCell>{u.gender==="female" ? u.hostel || "—" : "—"}</TableCell>
                    <TableCell>
                      <Badge variant={u.is_registered ? "default":"secondary"}>
                        {u.is_registered ? "Registered" : "Pending"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={()=>removeUser(u.id)}>
                        <Trash2 className="w-4 h-4"/>
                      </Button>
                    </TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
