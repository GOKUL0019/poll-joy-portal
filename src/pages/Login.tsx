import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Mail, Lock, Vote, Shield } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isAdminLogin, setIsAdminLogin] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    
    setLoading(true);
    try {
      // First try to sign in
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });

      if (error) {
        // If user doesn't exist, try to auto-register
        if (error.message.includes("Invalid login")) {
          const res = await supabase.functions.invoke("register-user", {
            body: { email: email.trim(), phone: password.trim() },
          });

          if (res.error || res.data?.error) {
            const msg = res.data?.error || "Login failed";
            if (res.data?.already_registered) {
              toast({ title: "Wrong password", description: "Please enter your registered phone number as password.", variant: "destructive" });
            } else {
              toast({ title: "Access Denied", description: msg, variant: "destructive" });
            }
            setLoading(false);
            return;
          }

          // Now sign in
          const { error: signInErr } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password: password.trim(),
          });
          if (signInErr) {
            toast({ title: "Error", description: signInErr.message, variant: "destructive" });
            setLoading(false);
            return;
          }
        } else {
          toast({ title: "Error", description: error.message, variant: "destructive" });
          setLoading(false);
          return;
        }
      }

      // Check role and redirect
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: adminCheck } = await supabase.rpc("has_role", {
          _user_id: user.id,
          _role: "admin",
        });
        navigate(adminCheck ? "/admin" : "/dashboard");
      }
    } catch {
      toast({ title: "Error", description: "Something went wrong", variant: "destructive" });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center gradient-hero p-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-accent mb-4"
          >
            <Vote className="w-8 h-8 text-primary" />
          </motion.div>
          <h1 className="text-3xl font-bold text-primary-foreground mb-2">
            Daily Poll
          </h1>
          <p className="text-primary-foreground/70">
            {isAdminLogin ? "Admin access" : "Sign in to cast your vote"}
          </p>
        </div>

        <Card className="shadow-elevated border-0">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl">
              {isAdminLogin ? "Admin Login" : "Welcome Back"}
            </CardTitle>
            <CardDescription>
              {isAdminLogin
                ? "Enter your admin credentials"
                : "Enter your email and phone number to continue"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">
                  {isAdminLogin ? "Password" : "Phone Number (Password)"}
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder={isAdminLogin ? "••••••••" : "Your phone number"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <Button
                type="submit"
                className="w-full gradient-primary text-primary-foreground hover:opacity-90 transition-opacity"
                disabled={loading}
              >
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
            <div className="mt-4 text-center">
              <button
                onClick={() => setIsAdminLogin(!isAdminLogin)}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
              >
                <Shield className="w-3 h-3" />
                {isAdminLogin ? "User login" : "Admin login"}
              </button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default Login;
