import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Wifi, RefreshCw, Laptop, Smartphone, Monitor, Router, Tv, Printer, HardDrive, Signal, Shield, AlertTriangle, Ban, Download, Upload, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface NetworkDevice {
  id: string;
  ip: string;
  mac: string;
  hostname: string;
  deviceType: "router" | "laptop" | "smartphone" | "desktop" | "tv" | "printer" | "iot" | "unknown";
  manufacturer: string;
  status: "online" | "offline";
  lastSeen: string;
  signalStrength?: number;
  isCurrentDevice?: boolean;
  isBlocked?: boolean;
  bandwidth?: {
    download: number; // in MB
    upload: number; // in MB
    downloadSpeed: number; // in Mbps
    uploadSpeed: number; // in Mbps
  };
}

interface ConnectionInfo {
  ip: string;
  userAgent: string;
  location?: {
    city?: string;
    region?: string;
    country?: string;
    isp?: string;
  };
}

const deviceIcons = {
  router: Router,
  laptop: Laptop,
  smartphone: Smartphone,
  desktop: Monitor,
  tv: Tv,
  printer: Printer,
  iot: HardDrive,
  unknown: Wifi,
};

const manufacturers = [
  "Apple Inc.", "Samsung Electronics", "Xiaomi", "Huawei", "OnePlus",
  "Dell Inc.", "HP Inc.", "Lenovo", "ASUS", "Intel Corporate",
  "TP-Link", "Netgear", "D-Link", "Cisco Systems", "Amazon Technologies",
  "Google Inc.", "Microsoft", "Sony", "LG Electronics", "Realme"
];

const generateMac = () => {
  const hex = "0123456789ABCDEF";
  let mac = "";
  for (let i = 0; i < 6; i++) {
    mac += hex[Math.floor(Math.random() * 16)] + hex[Math.floor(Math.random() * 16)];
    if (i < 5) mac += ":";
  }
  return mac;
};

const generateBandwidth = (deviceType: string, isOnline: boolean) => {
  if (!isOnline) return undefined;
  
  const baseMultiplier = {
    router: 0,
    laptop: 1.5,
    smartphone: 1,
    desktop: 2,
    tv: 3,
    printer: 0.1,
    iot: 0.2,
    unknown: 0.5,
  }[deviceType] || 1;

  return {
    download: Math.floor(Math.random() * 5000 * baseMultiplier + 100),
    upload: Math.floor(Math.random() * 500 * baseMultiplier + 10),
    downloadSpeed: Math.floor(Math.random() * 100 * baseMultiplier + 1),
    uploadSpeed: Math.floor(Math.random() * 20 * baseMultiplier + 1),
  };
};

const generateDevices = (userIp: string): NetworkDevice[] => {
  const ipParts = userIp.split(".");
  const baseIp = ipParts.length === 4 ? `${ipParts[0]}.${ipParts[1]}.${ipParts[2]}` : "192.168.1";

  // Fixed 6 devices: 3 phones + 3 laptops with specific names
  const fixedDevices: { hostname: string; deviceType: NetworkDevice["deviceType"]; manufacturer: string }[] = [
    { hostname: "MacBook-Pro", deviceType: "laptop", manufacturer: "Apple Inc." },
    { hostname: "iPhone-15-Pro", deviceType: "smartphone", manufacturer: "Apple Inc." },
    { hostname: "Dell-XPS-15", deviceType: "laptop", manufacturer: "Dell Inc." },
    { hostname: "Samsung-Galaxy-S24", deviceType: "smartphone", manufacturer: "Samsung Electronics" },
    { hostname: "HP-EliteBook", deviceType: "laptop", manufacturer: "HP Inc." },
    { hostname: "OnePlus-12", deviceType: "smartphone", manufacturer: "OnePlus" },
  ];

  const devices: NetworkDevice[] = fixedDevices.map((device, index) => ({
    id: `device-${index}`,
    ip: `${baseIp}.${10 + index * 5}`,
    mac: generateMac(),
    hostname: device.hostname,
    deviceType: device.deviceType,
    manufacturer: device.manufacturer,
    status: "online" as const,
    lastSeen: new Date().toISOString(),
    signalStrength: Math.floor(Math.random() * 30) + 70,
    isCurrentDevice: index === 0,
    isBlocked: false,
    bandwidth: generateBandwidth(device.deviceType, true),
  }));

  return devices.sort((a, b) => {
    const aNum = parseInt(a.ip.split(".")[3]);
    const bNum = parseInt(b.ip.split(".")[3]);
    return aNum - bNum;
  });
};

const formatBytes = (mb: number) => {
  if (mb >= 1000) return `${(mb / 1000).toFixed(1)} GB`;
  return `${mb} MB`;
};

export default function NetworkDevices() {
  const [devices, setDevices] = useState<NetworkDevice[]>([]);
  const [connectionInfo, setConnectionInfo] = useState<ConnectionInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [blockedDevices, setBlockedDevices] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const fetchNetworkData = async () => {
    setIsScanning(true);
    try {
      const { data, error } = await supabase.functions.invoke("my-connection");
      
      if (error) throw error;

      setConnectionInfo({
        ip: data.data?.ip || "192.168.1.100",
        userAgent: data.data?.userAgent,
        location: data.data?.location,
      });

      const networkDevices = generateDevices(data.data?.ip || "192.168.1.100");
      // Apply blocked status from state
      const devicesWithBlockedStatus = networkDevices.map(d => ({
        ...d,
        isBlocked: blockedDevices.has(d.id),
      }));
      setDevices(devicesWithBlockedStatus);

      toast({
        title: "Network Scan Complete",
        description: `Found ${networkDevices.length} devices on your network`,
      });
    } catch (error) {
      console.error("Error fetching network data:", error);
      const fallbackDevices = generateDevices("192.168.1.100");
      setDevices(fallbackDevices);
      toast({
        title: "Scan Complete",
        description: `Found ${fallbackDevices.length} devices (simulated)`,
      });
    } finally {
      setIsLoading(false);
      setIsScanning(false);
    }
  };

  useEffect(() => {
    fetchNetworkData();
  }, []);

  const handleBlockDevice = (deviceId: string, hostname: string) => {
    setBlockedDevices(prev => {
      const newSet = new Set(prev);
      newSet.add(deviceId);
      return newSet;
    });
    setDevices(prev => prev.map(d => 
      d.id === deviceId ? { ...d, isBlocked: true, status: "offline" as const, bandwidth: undefined } : d
    ));
    toast({
      title: "Device Blocked",
      description: `${hostname} has been blocked from the network`,
      variant: "destructive",
    });
  };

  const handleUnblockDevice = (deviceId: string, hostname: string) => {
    setBlockedDevices(prev => {
      const newSet = new Set(prev);
      newSet.delete(deviceId);
      return newSet;
    });
    setDevices(prev => prev.map(d => 
      d.id === deviceId ? { ...d, isBlocked: false, status: "online" as const, bandwidth: generateBandwidth(d.deviceType, true) } : d
    ));
    toast({
      title: "Device Unblocked",
      description: `${hostname} has been unblocked`,
    });
  };

  const onlineDevices = devices.filter(d => d.status === "online" && !d.isBlocked);
  const offlineDevices = devices.filter(d => d.status === "offline" || d.isBlocked);
  const unknownDevices = devices.filter(d => d.deviceType === "unknown" || d.manufacturer === "Unknown");
  const blockedCount = devices.filter(d => d.isBlocked).length;

  const totalDownload = devices.reduce((sum, d) => sum + (d.bandwidth?.download || 0), 0);
  const totalUpload = devices.reduce((sum, d) => sum + (d.bandwidth?.upload || 0), 0);

  const getSignalColor = (strength?: number) => {
    if (!strength) return "text-muted-foreground";
    if (strength >= 80) return "text-green-500";
    if (strength >= 50) return "text-yellow-500";
    return "text-red-500";
  };

  const formatLastSeen = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  const maxBandwidth = Math.max(...devices.map(d => d.bandwidth?.download || 0), 1);

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-mono font-bold text-foreground flex items-center gap-3">
              <Wifi className="h-8 w-8 text-primary" />
              Network Devices
            </h1>
            <p className="text-muted-foreground mt-1">
              Monitor all devices connected to your WiFi network
            </p>
          </div>
          <Button 
            onClick={fetchNetworkData} 
            disabled={isScanning}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isScanning ? "animate-spin" : ""}`} />
            {isScanning ? "Scanning..." : "Rescan Network"}
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Wifi className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{devices.length}</p>
                  <p className="text-xs text-muted-foreground">Total Devices</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <Signal className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-500">{onlineDevices.length}</p>
                  <p className="text-xs text-muted-foreground">Online</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-500/10">
                  <Ban className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-500">{blockedCount}</p>
                  <p className="text-xs text-muted-foreground">Blocked</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-500/10">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-yellow-500">{unknownDevices.length}</p>
                  <p className="text-xs text-muted-foreground">Unknown</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Download className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-lg font-bold text-blue-500">{formatBytes(totalDownload)}</p>
                  <p className="text-xs text-muted-foreground">Downloaded</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <Upload className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-lg font-bold text-purple-500">{formatBytes(totalUpload)}</p>
                  <p className="text-xs text-muted-foreground">Uploaded</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Your Connection */}
        {connectionInfo && (
          <Card variant="cyber">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Laptop className="h-5 w-5 text-primary" />
                Your Connection
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">IP Address</p>
                  <p className="font-mono font-medium">{connectionInfo.ip}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">ISP</p>
                  <p className="font-medium">{connectionInfo.location?.isp || "Unknown"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Location</p>
                  <p className="font-medium">
                    {connectionInfo.location?.city || "Unknown"}, {connectionInfo.location?.country || ""}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <Badge variant="default" className="bg-green-500/20 text-green-500 border-green-500/30">
                    Connected
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Bandwidth Monitoring */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Bandwidth Usage
            </CardTitle>
            <CardDescription>
              Data usage per device on your network
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {devices.filter(d => d.bandwidth && d.status === "online").slice(0, 6).map(device => {
                const DeviceIcon = deviceIcons[device.deviceType];
                const usagePercent = (device.bandwidth!.download / maxBandwidth) * 100;
                return (
                  <div key={device.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <DeviceIcon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{device.hostname}</span>
                        {device.isCurrentDevice && (
                          <Badge variant="outline" className="text-xs">You</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Download className="h-3 w-3 text-blue-500" />
                          {formatBytes(device.bandwidth!.download)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Upload className="h-3 w-3 text-purple-500" />
                          {formatBytes(device.bandwidth!.upload)}
                        </span>
                        <span className="text-green-500">{device.bandwidth!.downloadSpeed} Mbps</span>
                      </div>
                    </div>
                    <Progress value={usagePercent} className="h-2" />
                  </div>
                );
              })}
              {devices.filter(d => d.bandwidth && d.status === "online").length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No active bandwidth usage</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Devices Table */}
        <Card>
          <CardHeader>
            <CardTitle>Connected Devices</CardTitle>
            <CardDescription>
              All devices currently connected to your WiFi network
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Device</TableHead>
                      <TableHead>IP Address</TableHead>
                      <TableHead className="hidden md:table-cell">MAC Address</TableHead>
                      <TableHead className="hidden lg:table-cell">Bandwidth</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden sm:table-cell">Signal</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {devices.map((device) => {
                      const DeviceIcon = deviceIcons[device.deviceType];
                      return (
                        <TableRow 
                          key={device.id}
                          className={`${device.isCurrentDevice ? "bg-primary/5 border-l-2 border-l-primary" : ""} ${device.isBlocked ? "opacity-60 bg-red-500/5" : ""}`}
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg ${device.isBlocked ? "bg-red-500/10" : device.status === "online" ? "bg-primary/10" : "bg-muted"}`}>
                                <DeviceIcon className={`h-4 w-4 ${device.isBlocked ? "text-red-500" : device.status === "online" ? "text-primary" : "text-muted-foreground"}`} />
                              </div>
                              <div>
                                <p className="font-medium flex items-center gap-2">
                                  {device.hostname}
                                  {device.isCurrentDevice && (
                                    <Badge variant="outline" className="text-xs">You</Badge>
                                  )}
                                  {device.deviceType === "unknown" && (
                                    <Badge variant="secondary" className="text-xs bg-yellow-500/20 text-yellow-600">Unknown</Badge>
                                  )}
                                </p>
                                <p className="text-xs text-muted-foreground capitalize">{device.manufacturer}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <code className="text-sm bg-muted px-2 py-1 rounded">{device.ip}</code>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <code className="text-xs text-muted-foreground">{device.mac}</code>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            {device.bandwidth ? (
                              <div className="text-xs">
                                <span className="text-blue-500">↓ {device.bandwidth.downloadSpeed} Mbps</span>
                                <span className="mx-1 text-muted-foreground">/</span>
                                <span className="text-purple-500">↑ {device.bandwidth.uploadSpeed} Mbps</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-xs">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {device.isBlocked ? (
                              <Badge variant="destructive" className="bg-red-500/20 text-red-500 border-red-500/30">
                                Blocked
                              </Badge>
                            ) : (
                              <Badge 
                                variant={device.status === "online" ? "default" : "secondary"}
                                className={device.status === "online" 
                                  ? "bg-green-500/20 text-green-500 border-green-500/30" 
                                  : ""
                                }
                              >
                                {device.status}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            {device.signalStrength && !device.isBlocked ? (
                              <div className="flex items-center gap-2">
                                <Signal className={`h-4 w-4 ${getSignalColor(device.signalStrength)}`} />
                                <span className={`text-sm ${getSignalColor(device.signalStrength)}`}>
                                  {device.signalStrength}%
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {!device.isCurrentDevice && device.deviceType !== "router" && (
                              device.isBlocked ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="gap-1 text-green-600 border-green-600/30 hover:bg-green-500/10"
                                  onClick={() => handleUnblockDevice(device.id, device.hostname)}
                                >
                                  <Shield className="h-3 w-3" />
                                  Unblock
                                </Button>
                              ) : (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="gap-1 text-red-600 border-red-600/30 hover:bg-red-500/10"
                                    >
                                      <Ban className="h-3 w-3" />
                                      Block
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Block Device?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        This will block <strong>{device.hostname}</strong> ({device.ip}) from accessing your network. 
                                        The device will be disconnected immediately.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleBlockDevice(device.id, device.hostname)}
                                        className="bg-red-600 hover:bg-red-700"
                                      >
                                        Block Device
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Note */}
        <Card className="bg-muted/30 border-dashed">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground text-center">
              <AlertTriangle className="h-4 w-4 inline mr-2" />
              Note: Due to browser security restrictions, actual network scanning and device blocking is limited. 
              Data shown is simulated for demonstration purposes.
            </p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}